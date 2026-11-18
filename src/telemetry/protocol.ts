export const MODULES = {
  water: { title: 'Clean Water', file: 'water-purification.html', parts: ['sedimentation', 'decantation', 'filtration', 'boiling'] },
  power: { title: 'Power for Palampur', file: 'power-palampur.html', parts: ['circuit', 'current', 'conductors'] },
  ration: { title: 'Fair Rations', file: 'rationing-palampur.html', parts: ['variable', 'fractions', 'equation'] },
} as const;

export const MISCONCEPTIONS = {
  clear_means_safe: { module: 'water', concept: 'concept-water-safety', label: 'Clear water is safe to drink' },
  current_consumed: { module: 'power', concept: 'concept-electricity', label: 'A bulb uses up electric current' },
  bigger_denominator_bigger: { module: 'ration', concept: 'concept-fractions', label: 'A bigger denominator makes a bigger fraction' },
} as const;

const QUESTIONS = {
  water: ['safe-water'],
  power: ['closed-loop', 'current-flow', 'conductors', 'check-loop', 'check-current', 'check-conductors', 'check-transfer'],
  ration: ['fraction-size'],
} as const;

export type ModuleId = keyof typeof MODULES;
export type MisconceptionId = keyof typeof MISCONCEPTIONS;
export type Cri = 1 | 2 | 3;
export type Student = { name: string; rollNo: string };
export type Classroom = { id: string; section: string; teacher: string };
export type Progress = { student: Student; events: Telemetry[] };

type EventData =
  | { event: 'PREDICTION_RECORDED'; questionId: string; choice: number; attemptId: string }
  | { event: 'CRI_RECORDED'; questionId: string; cri: Cri; attemptId: string }
  | { event: 'PREDICTION_CONFIRMED'; questionId: string; choice: number; cri: Cri; correct: boolean; attemptId: string }
  | { event: 'MISCONCEPTION_RECORDED'; misconceptionId: MisconceptionId; cri: 3 }
  | { event: 'NOTEBOOK_PART_UNLOCKED'; partId: string }
  | { event: 'MODULE_COMPLETED'; score?: number };

export type Telemetry = EventData & { id: string; moduleId: ModuleId; timestamp: number };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const identity = (value: string) => value.trim().normalize('NFC').replace(/\s+/g, ' ').toLowerCase();
export const studentKey = (student: Student) => JSON.stringify([identity(student.name), identity(student.rollNo)]);
export const classroomKey = identity;
export const moduleIds = Object.keys(MODULES) as ModuleId[];
export const misconceptionIds = Object.keys(MISCONCEPTIONS) as MisconceptionId[];
export const notebookParts = moduleIds.flatMap(moduleId => MODULES[moduleId].parts.map(part => moduleId + '.' + part));
export const criLabels = { 1: 'Not Sure', 2: 'A Bit Sure', 3: 'Very Sure' };

export function parseStudent(value: unknown): Student | null {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.rollNo !== 'string') return null;
  const name = value.name.trim();
  const rollNo = value.rollNo.trim();
  if (!name || name.length > 64 || !rollNo || rollNo.length > 24 || /[\u0000-\u001f\u007f]/.test(name + rollNo)) return null;
  return { name, rollNo };
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
}

function isCri(value: unknown): value is Cri {
  return value === 1 || value === 2 || value === 3;
}

export function parseTelemetry(value: unknown): Telemetry | null {
  if (!isRecord(value)) return null;
  const { id, moduleId, timestamp, event, questionId, choice, cri, attemptId, correct, partId, misconceptionId, score } = value;
  if (!isId(id) || typeof moduleId !== 'string' || !moduleIds.includes(moduleId as ModuleId) ||
      typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > 8.64e15) return null;
  const base = { id, moduleId: moduleId as ModuleId, timestamp };
  const hasQuestion = typeof questionId === 'string' &&
    (QUESTIONS[base.moduleId] as readonly string[]).includes(questionId) && isId(attemptId);
  const hasChoice = typeof choice === 'number' && Number.isInteger(choice) && choice >= 0 && choice <= 2;
  switch (event) {
    case 'PREDICTION_RECORDED':
      return hasQuestion && hasChoice ? { ...base, event, questionId, attemptId, choice } : null;
    case 'CRI_RECORDED':
      return hasQuestion && isCri(cri) ? { ...base, event, questionId, attemptId, cri } : null;
    case 'PREDICTION_CONFIRMED':
      return hasQuestion && hasChoice && isCri(cri) && typeof correct === 'boolean'
        ? { ...base, event, questionId, attemptId, choice, cri, correct } : null;
    case 'MISCONCEPTION_RECORDED':
      if (typeof misconceptionId !== 'string' || !misconceptionIds.includes(misconceptionId as MisconceptionId) ||
          MISCONCEPTIONS[misconceptionId as MisconceptionId].module !== moduleId || cri !== 3) return null;
      return { ...base, event, misconceptionId: misconceptionId as MisconceptionId, cri };
    case 'NOTEBOOK_PART_UNLOCKED':
      return typeof partId === 'string' && partId.startsWith(moduleId + '.') && notebookParts.includes(partId)
        ? { ...base, event, partId } : null;
    case 'MODULE_COMPLETED':
      if (score === undefined) return { ...base, event };
      return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 100
        ? { ...base, event, score } : null;
    default:
      return null;
  }
}

export function summarize(events: Telemetry[]) {
  const completed = new Set<ModuleId>();
  const parts = new Set<string>();
  const misconceptions = new Set<MisconceptionId>();
  const confidenceByAttempt = new Map<string, Cri>();
  const latestPredictions = new Map<string, Extract<Telemetry, { event: 'PREDICTION_CONFIRMED' }>>();
  const scores = new Map<ModuleId, number>();
  for (const entry of events) {
    switch (entry.event) {
      case 'MODULE_COMPLETED':
        completed.add(entry.moduleId);
        if (entry.score !== undefined) scores.set(entry.moduleId, entry.score);
        break;
      case 'NOTEBOOK_PART_UNLOCKED':
        parts.add(entry.partId);
        break;
      case 'MISCONCEPTION_RECORDED':
        misconceptions.add(entry.misconceptionId);
        break;
      case 'PREDICTION_CONFIRMED':
        latestPredictions.set(entry.moduleId + '.' + entry.questionId, entry);
        confidenceByAttempt.set(entry.attemptId, entry.cri);
        break;
      case 'CRI_RECORDED':
        confidenceByAttempt.set(entry.attemptId, entry.cri);
        break;
    }
  }
  return { completed, parts, misconceptions, latestPredictions, scores, confidence: Array.from(confidenceByAttempt.values()) };
}

export function mergeEvents(previous: Telemetry[], incoming: Telemetry[]): Telemetry[] {
  const events = new Map(previous.map(event => [event.id, event]));
  for (const entry of incoming) if (!events.has(entry.id)) events.set(entry.id, entry);
  return Array.from(events.values()).sort((a, b) => a.timestamp - b.timestamp);
}
