import { lazy, Suspense, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { INITIAL_ACHIEVEMENTS, INITIAL_VILLAGE_BUILDINGS, SAMPLE_CLASS_DATASET } from '../../data/palampurData';
import { classSnapshot } from '../../telemetry/analytics';
import type { Classroom, Progress } from '../../telemetry/protocol';
import { importProgress } from '../../telemetry/store';
import type { Assignment, ConceptInsight, StudentRecord, TeacherNavTab } from '../../types/palampur';
import { Modal } from '../common/Modal';
import { ClassAnalyticsView, StudentDetailView, StudentPerformanceMatrix } from './ClassAnalyticsAndMatrixViews';
import { LiveClassOverview, LiveStudentDetail, LiveStudentRoster } from './LiveClassViews';
import { TeacherOverview } from './TeacherOverview';
import { AssignmentsView, ReportsView, TeacherVillageView } from './TeacherOperationalViews';
import { TeacherShell } from './TeacherShell';
import { MisconceptionsView, TeachingRecommendationsView } from './TeachingAndMisconceptionsViews';

const ScanProgress = lazy(() => import('../ScanProgress').then(module => ({ default: module.ScanProgress })));
const DEMO = 'demo';
const cohortId = (id: string) => 'class:' + id;
type Materials = { assignments: Assignment[]; notes: Record<string, string> };
const emptyMaterials = () => ({ assignments: [], notes: {} });

function readMaterials(id: string): Materials {
  try {
    const raw = localStorage.getItem('rebuild.class-materials.v1.' + id);
    return raw ? JSON.parse(raw) : emptyMaterials();
  } catch { return emptyMaterials(); }
}

export default function TeacherDashboard({ selected, classrooms, rosters, local, onExit }: {
  selected: Classroom; classrooms: Classroom[]; rosters: Map<string, Map<string, Progress>>; local: Progress[]; onExit: () => void;
}) {
  const [selection, setSelection] = useState(cohortId(selected.id));
  const [tab, setTab] = useState<TeacherNavTab>('overview');
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [materials, setMaterials] = useState<Record<string, Materials>>({});
  const demo = selection === DEMO;
  const classroom = classrooms.find(item => cohortId(item.id) === selection) ?? selected;
  const roster = rosters.get(classroom.id);
  const stored = useMemo(() => readMaterials(selection), [selection]);
  const edits = materials[selection] ?? stored;
  const analytics = useMemo(() => classSnapshot(classroom, Array.from(roster?.values() ?? []), edits.assignments, edits.notes), [classroom, roster, edits]);
  const dataset = demo ? {
    ...SAMPLE_CLASS_DATASET,
    teacherName: classroom.teacher,
    students: SAMPLE_CLASS_DATASET.students.map(student => ({ ...student, teacherNote: edits.notes[student.id] ?? student.teacherNote })),
    assignments: [...edits.assignments, ...SAMPLE_CLASS_DATASET.assignments],
  } : analytics.dataset;
  const buildings = demo ? INITIAL_VILLAGE_BUILDINGS : analytics.buildings;
  const inspected = dataset.students.find(student => student.id === inspectedId);
  const inspectedProgress = inspected ? roster?.get(inspected.id) : undefined;
  const cohorts = [...classrooms.map(item => ({ id: cohortId(item.id), label: item.section })), { id: DEMO, label: 'Sample Class (demo)' }];

  function navigate(next: TeacherNavTab) {
    setTab(next);
    setInspectedId(null);
    setFeedback('');
    window.scrollTo(0, 0);
  }

  function switchCohort(id: string) {
    setSelection(id);
    setScanning(false);
    navigate('overview');
  }

  function inspect(student: StudentRecord) {
    navigate('class');
    setInspectedId(student.id);
  }

  function saveEdits(next: Materials, success: string) {
    setMaterials(previous => ({ ...previous, [selection]: next }));
    try {
      localStorage.setItem('rebuild.class-materials.v1.' + selection, JSON.stringify(next));
      setFeedback(success);
    } catch {
      setFeedback('Browser storage is unavailable. This change is saved for this visit only.');
    }
  }

  function createAssignment(value: Omit<Assignment, 'id' | 'submittedCount' | 'averageScore'>) {
    const id = Array.from(crypto.getRandomValues(new Uint32Array(3))).join('-');
    saveEdits({ ...edits, assignments: [{ ...value, id, submittedCount: 0, averageScore: 0 }, ...edits.assignments] }, 'Assignment saved.');
  }

  function assignRemediation(concept: ConceptInsight) {
    if (!concept.affectedStudentIds.length) return;
    createAssignment({
      title: 'Remediation · ' + concept.conceptTitle,
      subject: concept.subject, conceptFocus: concept.conceptTitle,
      dueDate: new Date(Date.now() + 7 * 86_400_000).toLocaleDateString(),
      assignedTo: concept.affectedStudentIds.length + ' flagged students',
      totalCount: concept.affectedStudentIds.length, status: 'Active',
    });
  }

  function saveNote(studentId: string, note: string) {
    saveEdits({ ...edits, notes: { ...edits.notes, [studentId]: note } }, 'Teacher note saved.');
  }

  return (
    <TeacherShell
      dataset={dataset} activeDatasetId={selection} cohorts={cohorts} onChangeDataset={switchCohort}
      activeTab={tab} onSelectTab={navigate} onInspectStudent={inspect} onSwitchRole={onExit} onSignOut={onExit}
      notifications={[]} onMarkNotificationsRead={() => {}}
      onScan={demo ? undefined : () => setScanning(true)}
    >
      {feedback && <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-[#e5eadb] p-3 text-sm"><CheckCircle2 size={16} /> {feedback}</p>}
      {inspected ? (
        demo ? <StudentDetailView key={inspected.id} student={inspected} achievements={INITIAL_ACHIEVEMENTS} onBack={() => setInspectedId(null)} onSaveNote={saveNote} />
          : inspectedProgress && <LiveStudentDetail key={inspected.id} progress={inspectedProgress} student={inspected} onBack={() => setInspectedId(null)} onSaveNote={note => saveNote(inspected.id, note)} />
      ) : (
        <>
          {tab === 'overview' && (demo
            ? <TeacherOverview dataset={dataset} buildings={buildings} onInspectStudent={inspect} onNavigate={navigate} />
            : <LiveClassOverview analytics={analytics} type="overview" onOpenStudents={() => navigate('class')} />)}
          {tab === 'class' && (demo ? <StudentPerformanceMatrix dataset={dataset} onInspectStudent={inspect} /> : <LiveStudentRoster students={dataset.students} onInspect={inspect} />)}
          {tab === 'analytics' && (demo
            ? <ClassAnalyticsView dataset={dataset} buildings={buildings} onInspectStudent={inspect} />
            : <LiveClassOverview analytics={analytics} type="analytics" onOpenStudents={() => navigate('class')} />)}
          {tab === 'recommendations' && <TeachingRecommendationsView dataset={dataset} buildings={buildings} isSampleClass={demo} onToggleSampleClass={() => switchCohort(demo ? cohortId(selected.id) : DEMO)} onInspectStudent={inspect} onAssignRemediation={assignRemediation} />}
          {tab === 'misconceptions' && <MisconceptionsView dataset={dataset} onInspectStudent={inspect} onAssignRemediation={assignRemediation} />}
          {tab === 'assignments' && <AssignmentsView dataset={dataset} onCreateAssignment={createAssignment} />}
          {tab === 'village' && <TeacherVillageView dataset={dataset} buildings={buildings} />}
          {tab === 'reports' && <ReportsView dataset={dataset} buildings={buildings} />}
          {tab === 'settings' && (
            <section className="max-w-lg rounded-2xl border border-[#e9d9c7] bg-[#fffdfa] p-5">
              <h1 className="text-2xl font-bold">Classroom settings</h1>
              <label className="mt-4 grid gap-2 font-semibold">Active classroom
                <select value={selection} onChange={event => switchCohort(event.currentTarget.value)} className="rounded-lg border border-[#d4bea2] bg-[#fff9ee] p-2">
                  {cohorts.map(cohort => <option value={cohort.id} key={cohort.id}>{cohort.label}</option>)}
                </select>
              </label>
              <p className="mt-3 text-sm text-[#655346]">Class records are stored in this browser. Select a class before scanning student work.</p>
              <button type="button" className="sync-button mt-4" onClick={onExit}>Back to role selection</button>
            </section>
          )}
        </>
      )}
      {scanning && !demo && (
        <Suspense fallback={<Modal title="Scan Student Work" onDismiss={() => setScanning(false)}><p role="status">Opening the scanner…</p></Modal>}>
          <ScanProgress section={classroom.section} local={local} onImport={progress => importProgress(classroom.id, progress)} onDismiss={() => setScanning(false)} />
        </Suspense>
      )}
    </TeacherShell>
  );
}
