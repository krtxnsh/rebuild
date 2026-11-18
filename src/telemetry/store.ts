import { useSyncExternalStore } from 'react';
import { classroomKey, mergeEvents, studentKey, type Classroom, type Progress, type Student } from './protocol.ts';

const PREFIX = 'rebuild.unified.v1.';
type Work = Progress & { classroomId?: string; local?: true };
type Entry = { kind: 'work'; work: Work } | { kind: 'classroom'; classroom: Classroom };
type Snapshot = {
  local: Map<string, Progress>;
  classrooms: Classroom[];
  rosters: Map<string, Map<string, Progress>>;
  storageIssue: boolean;
};

const listeners = new Set<() => void>();
const temporary = new Map<string, Entry>();
let snapshot: Snapshot;

function collect(): Snapshot {
  const entries = new Map(temporary);
  let storageIssue = temporary.size > 0;
  try {
    const storage = window.localStorage;
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith(PREFIX) || entries.has(key)) continue;
      try {
        const entry = JSON.parse(storage.getItem(key) ?? 'null') as Entry | null;
        if (entry) entries.set(key, entry);
      } catch {
        storageIssue = true;
      }
    }
  } catch {
    storageIssue = true;
  }

  const local = new Map<string, Progress>();
  const classrooms: Classroom[] = [];
  const rosters = new Map<string, Map<string, Progress>>();
  function add(target: Map<string, Progress>, { student, events }: Progress) {
    const id = studentKey(student);
    target.set(id, { student, events: (target.get(id)?.events ?? []).concat(events) });
  }
  for (const entry of entries.values()) {
    if (entry.kind === 'classroom') {
      classrooms.push(entry.classroom);
    } else if (entry.kind === 'work') {
      const work = entry.work;
      if (work.local) add(local, work);
      if (work.classroomId) {
        const roster = rosters.get(work.classroomId) ?? new Map<string, Progress>();
        add(roster, work);
        rosters.set(work.classroomId, roster);
      }
    }
  }
  for (const records of [local, ...rosters.values()]) {
    for (const record of records.values()) record.events = mergeEvents([], record.events);
  }
  classrooms.sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));
  return { local, classrooms, rosters, storageIssue };
}

function refresh() {
  snapshot = collect();
  listeners.forEach(listener => listener());
}

function save(id: string, entry: Entry) {
  const key = PREFIX + id;
  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
    temporary.delete(key);
  } catch {
    temporary.set(key, entry);
  }
  refresh();
}

window.addEventListener('storage', event => {
  if (event.key === null || event.key.startsWith(PREFIX)) refresh();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getSnapshot = () => snapshot ??= collect();
export const useProgressStore = () => useSyncExternalStore(subscribe, getSnapshot);

export function registerClass(section: string, teacher: string): Classroom {
  const classroom = { id: classroomKey(section), section, teacher };
  save('classroom.' + classroom.id, { kind: 'classroom', classroom });
  return classroom;
}

export function registerStudent(student: Student, classroomId: string) {
  save('student.' + JSON.stringify([classroomId, studentKey(student)]), {
    kind: 'work',
    work: { student, events: [], local: true, classroomId },
  });
  if (classroomId) importProgress(classroomId, getSnapshot().local.get(studentKey(student)) ?? { student, events: [] });
}

export function recordProgress(work: Work) {
  const [event] = work.events;
  if (event) save('event.' + event.id, { kind: 'work', work });
}

export function importProgress(classroomId: string, progress: Progress) {
  const id = studentKey(progress.student);
  const existing = getSnapshot().rosters.get(classroomId)?.get(id);
  const seen = new Set(existing?.events.map(event => event.id));
  const events = progress.events.filter(event => !seen.has(event.id));
  if (existing && !events.length) return { unchanged: true, count: 0 };
  const batchId = Array.from(crypto.getRandomValues(new Uint32Array(3)), n => n.toString(16).padStart(8, '0')).join('');
  save('import.' + batchId, { kind: 'work', work: { student: progress.student, events, classroomId } });
  return { unchanged: false, count: events.length };
}
