import { buildConceptInsights, INITIAL_VILLAGE_BUILDINGS } from '../data/palampurData';
import type { Assignment, ClassDataset, ConceptMasteryState, StudentRecord, Subject, VillageBuilding } from '../types/palampur';
import { MISCONCEPTIONS, MODULES, moduleIds, studentKey, summarize, type Classroom, type ModuleId, type Progress } from './protocol';

export const moduleSubject: Record<ModuleId, Subject> = { water: 'Science', power: 'Science', ration: 'Maths' };
const buildingModules: Record<string, ModuleId> = { 'water-plant': 'water', 'solar-microgrid': 'power', 'granary-mill': 'ration' };
const primaryQuestions = { water: 'safe-water', power: 'current-flow', ration: 'fraction-size' };
const percent = (part: number, total: number) => total ? Math.round(100 * part / total) : 0;

export function classSnapshot(classroom: Classroom, roster: Progress[], assignments: Assignment[], notes: Record<string, string>) {
  const confidence = { 1: 0, 2: 0, 3: 0 };
  const completions = { water: 0, power: 0, ration: 0 };
  const misconceptionCounts = { clear_means_safe: 0, current_consumed: 0, bigger_denominator_bigger: 0 };
  const uncertain: Record<string, number> = {};
  const allPredictions = { correct: 0, count: 0 };
  const students: StudentRecord[] = [];
  const now = Date.now();

  for (const progress of roster) {
    const summary = summarize(progress.events);
    const id = studentKey(progress.student);
    for (const cri of summary.confidence) confidence[cri]++;
    for (const chapter of summary.completed) completions[chapter]++;
    for (const tag of summary.misconceptions) misconceptionCounts[tag]++;

    const conceptStates: Record<string, ConceptMasteryState> = {};
    for (const [tag, item] of Object.entries(MISCONCEPTIONS)) {
      const question = summary.latestPredictions.get(item.module + '.' + primaryQuestions[item.module]);
      const check = item.module === 'power' ? summary.latestPredictions.get('power.check-current') : undefined;
      const latest = check && (!question || check.timestamp >= question.timestamp) ? check : question;
      if (latest && latest.cri === 1) uncertain[item.concept] = (uncertain[item.concept] ?? 0) + 1;
      conceptStates[item.concept] = summary.misconceptions.has(tag as keyof typeof MISCONCEPTIONS)
        ? 'misconception'
        : latest ? latest.correct && latest.cri === 3 ? 'secure' : 'fragile' : 'unseen';
    }
    const predictions = Array.from(summary.latestPredictions.values());
    const correct = predictions.filter(entry => entry.correct).length;
    allPredictions.correct += correct;
    allPredictions.count += predictions.length;
    const predictionCounts: NonNullable<StudentRecord['predictionCounts']> = {};
    const subjects: StudentRecord['subjects'] = { Maths: 0, Science: 0, English: 0, EVS: 0 };
    for (const subject of ['Maths', 'Science'] as const) {
      const subset = predictions.filter(entry => moduleSubject[entry.moduleId] === subject);
      const count = subset.filter(entry => entry.correct).length;
      if (subset.length) predictionCounts[subject] = { correct: count, total: subset.length };
      subjects[subject] = percent(count, subset.length);
    }
    students.push({
      id, ...progress.student,
      avatarVariant: students.length % 6,
      level: 1, xp: 0, streakDays: 0, weeklyDelta: 0,
      activeThisWeek: progress.events.some(entry => entry.timestamp >= now - 7 * 86_400_000 && entry.timestamp <= now),
      overallScore: percent(correct, predictions.length), completionRate: percent(summary.completed.size, moduleIds.length),
      status: summary.misconceptions.size ? 'Needs Attention' : Object.values(conceptStates).includes('fragile') ? 'Fragile' : 'On Track',
      subjects, predictionCounts, modulesCompleted: summary.completed.size, totalModules: moduleIds.length,
      conceptStates, activeMisconceptions: Array.from(summary.misconceptions, tag => MISCONCEPTIONS[tag].label),
      recentActivity: progress.events.filter(entry => entry.event === 'MODULE_COMPLETED').reverse().slice(0, 5)
        .map(entry => ({ id: entry.id, title: MODULES[entry.moduleId].title, subject: moduleSubject[entry.moduleId],
          scorePct: entry.score ?? 0, xpEarned: 0, timestamp: new Date(entry.timestamp).toLocaleDateString() })),
      weeklySeries: [], monthlySeries: [], badgesUnlocked: [], teacherNote: notes[id],
    });
  }
  students.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }) || a.name.localeCompare(b.name));

  const completed = Object.values(completions).reduce((sum, count) => sum + count, 0);
  const villageProgressPct = percent(completed, roster.length * moduleIds.length);
  const buildings: VillageBuilding[] = INITIAL_VILLAGE_BUILDINGS.filter(building => buildingModules[building.id]).map(building => {
    const chapter = buildingModules[building.id];
    const progress = percent(completions[chapter], roster.length);
    return { ...building, name: MODULES[chapter].title, progress,
      status: progress === 100 ? 'restored' : progress > 0 ? 'restoring' : 'foundation' };
  });

  const dataset: ClassDataset = {
    id: 'live-class',
    label: classroom.section, gradeLabel: classroom.section, teacherName: classroom.teacher, schoolName: 'REBUILD · Palampur',
    villageProgressPct,
    classConfidencePct: percent(confidence[3], confidence[1] + confidence[2] + confidence[3]), classConfidenceDelta: 0,
    students,
    conceptInsights: buildConceptInsights(students).filter(insight => insight.id !== 'concept-photosynthesis')
      .map(insight => ({ ...insight, unsureCount: uncertain[insight.id] ?? 0 })),
    assignments,
  };
  return { dataset, buildings, confidence, completions, misconceptionCounts, allPredictions };
}
