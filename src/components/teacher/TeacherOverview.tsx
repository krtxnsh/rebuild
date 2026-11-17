import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Star,
  Users,
} from 'lucide-react';
import {
  ClassDataset,
  StudentRecord,
  TeacherNavTab,
  VillageBuilding,
} from '../../types/palampur';
import { AnimatedNumber, PersonAvatar } from '../common/BrandMark';
import { CircularProgressRing, PerformanceLineChart } from '../common/Charts';
import { PalampurVillageCanvas } from '../three/PalampurVillageCanvas';

interface TeacherOverviewProps {
  dataset: ClassDataset;
  buildings: VillageBuilding[];
  onInspectStudent: (student: StudentRecord) => void;
  onNavigate: (tab: TeacherNavTab) => void;
}

export const TeacherOverview: React.FC<TeacherOverviewProps> = ({
  dataset,
  buildings,
  onInspectStudent,
  onNavigate,
}) => {
  const [visibleSubjects, setVisibleSubjects] = useState<
    Record<'Maths' | 'Science' | 'English', boolean>
  >({
    Maths: true,
    Science: true,
    English: true,
  });

  const totalStudents = dataset.students.length;
  const activeStudents = dataset.students.filter((s) => s.activeThisWeek).length;
  const avgCompletion = Math.round(
    dataset.students.reduce((acc, s) => acc + s.completionRate, 0) / Math.max(1, totalStudents),
  );
  const classAccuracy =
    dataset.id === 'class-6a'
      ? 68
      : Math.round(
          dataset.students.reduce((acc, s) => acc + s.overallScore, 0) /
            Math.max(1, totalStudents),
        );

  const needsAttention = [...dataset.students]
    .filter((s) => s.status !== 'On Track' || s.overallScore < 60)
    .sort((a, b) => a.overallScore - b.overallScore)
    .slice(0, 4);

  // Mon-Sun series grounded in dataset subject averages
  const avgM = Math.round(
    dataset.students.reduce((a, s) => a + s.subjects.Maths, 0) / Math.max(1, totalStudents),
  );
  const avgS = Math.round(
    dataset.students.reduce((a, s) => a + s.subjects.Science, 0) / Math.max(1, totalStudents),
  );
  const avgE = Math.round(
    dataset.students.reduce((a, s) => a + s.subjects.English, 0) / Math.max(1, totalStudents),
  );

  const weeklySeries = [
    visibleSubjects.Maths && {
      name: 'Maths',
      color: '#E97832',
      values: [avgM - 18, avgM - 12, avgM - 10, avgM - 6, avgM - 3, avgM + 4, avgM],
    },
    visibleSubjects.Science && {
      name: 'Science',
      color: '#65966A',
      values: [avgS - 20, avgS - 15, avgS - 11, avgS - 8, avgS - 4, avgS - 1, avgS],
    },
    visibleSubjects.English && {
      name: 'English',
      color: '#E8AA43',
      values: [avgE - 14, avgE - 9, avgE - 7, avgE - 5, avgE - 2, avgE + 2, avgE],
    },
  ].filter(Boolean) as Array<{ name: string; color: string; values: number[] }>;

  const topConcept = dataset.conceptInsights[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#C85A20]">
            {dataset.schoolName} · {dataset.gradeLabel}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#33251F]">
            Teacher Dashboard
          </h1>
          <p className="text-sm text-[#75665C] mt-0.5">
            Track progress, guide your students, and rebuild Palampur together.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('recommendations')}
            className="px-4 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF9F1] text-xs font-semibold text-[#33251F] transition-colors cursor-pointer whitespace-nowrap"
          >
            What to Teach Next
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-xs font-semibold text-[#FFFDFA] transition-colors cursor-pointer whitespace-nowrap"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* 4 KPI Cards Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#E97832]/15 text-[#C85A20] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-[#33251F] tabular-nums">
              <AnimatedNumber value={totalStudents} />
            </div>
            <div className="text-xs text-[#75665C]">Total Students</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#65966A]/15 text-[#65966A] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-[#33251F] tabular-nums">
              <AnimatedNumber value={activeStudents} />
            </div>
            <div className="text-xs text-[#75665C]">Active Students</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#33251F]/10 text-[#33251F] flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-[#33251F] tabular-nums">
              <AnimatedNumber value={avgCompletion} suffix="%" />
            </div>
            <div className="text-xs text-[#75665C]">Avg. Completion</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#E8AA43]/20 text-[#C85A20] flex items-center justify-center shrink-0">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-[#33251F] tabular-nums">
              <AnimatedNumber value={classAccuracy} suffix="%" />
            </div>
            <div className="text-xs text-[#75665C]">Class Accuracy</div>
          </div>
        </div>
      </section>

      {/* Main Analytics + Village Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Cols: Class Performance Chart + Students Needing Attention */}
        <div className="xl:col-span-8 space-y-6">
          <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#33251F]">
                  Class Performance
                </h2>
                <p className="text-xs text-[#75665C]">
                  Weekly progression by subject (Mon–Sun)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(['Maths', 'Science', 'English'] as const).map((subj) => {
                  const color =
                    subj === 'Maths'
                      ? '#E97832'
                      : subj === 'Science'
                        ? '#65966A'
                        : '#E8AA43';
                  const active = visibleSubjects[subj];
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() =>
                        setVisibleSubjects((prev) => ({
                          ...prev,
                          [subj]: !prev[subj],
                        }))
                      }
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-[#E9D9C7] bg-[#FFF9F1] text-[#33251F]'
                          : 'border-transparent bg-transparent text-[#75665C]/60'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>{subj}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <PerformanceLineChart
              labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
              series={weeklySeries}
              height={215}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Students Needing Attention */}
            <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-bold text-[#33251F]">
                  Students to Support
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('class')}
                  className="text-xs font-semibold text-[#C85A20] hover:underline cursor-pointer"
                >
                  All {totalStudents} →
                </button>
              </div>

              <div className="divide-y divide-[#E9D9C7]">
                {needsAttention.map((stu) => (
                  <div
                    key={stu.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PersonAvatar
                        name={stu.name}
                        variant={stu.avatarVariant}
                        size={36}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#33251F] truncate">
                          {stu.name}
                        </div>
                        <div className="text-xs text-[#C94B3F] font-mono tabular-nums">
                          {stu.overallScore}% · {stu.activeMisconceptions.length} flags
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectStudent(stu)}
                      className="px-3 py-1.5 rounded-lg bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Recommendation Card */}
            {topConcept && (
              <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFF9F1] p-6 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C94B3F]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Priority Teaching Alert · {topConcept.domain}</span>
                  </div>
                  <h2 className="mt-2 font-display text-lg font-bold text-[#33251F]">
                    {topConcept.conceptTitle}
                  </h2>
                  <p className="mt-1.5 text-xs text-[#75665C] leading-relaxed">
                    {topConcept.holdIdeaCount} students hold this misconception and{' '}
                    {topConcept.unsureCount} need immediate clarification.
                  </p>
                  <div className="mt-4 text-xs text-[#33251F] bg-[#FFFDFA] border border-[#E9D9C7] rounded-xl p-3">
                    <span className="font-semibold">Suggested Activity:</span>{' '}
                    {topConcept.suggestedClassroomActivity}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('recommendations')}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#33251F] hover:bg-[#4A372E] text-[#FFF9F1] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Open Teaching Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Village Progress (Overall) with Live 3D View */}
        <div className="xl:col-span-4 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-[#33251F]">
                  Village Progress
                </h2>
                <p className="text-xs text-[#75665C]">Overall class restoration</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('village')}
                className="text-xs font-semibold text-[#C85A20] hover:underline cursor-pointer"
              >
                Inspect 3D →
              </button>
            </div>

            <div className="my-6 flex justify-center">
              <CircularProgressRing
                value={dataset.villageProgressPct}
                size={136}
                strokeWidth={12}
                sublabel="Restored"
              />
            </div>

            <div className="h-52 rounded-xl border border-[#E9D9C7] overflow-hidden">
              <PalampurVillageCanvas
                buildings={buildings}
                mode="preview"
                showDock={false}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#E9D9C7] space-y-2 text-xs">
            {buildings.slice(0, 3).map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <span className="text-[#75665C] truncate pr-2">{b.name}</span>
                <span className="font-mono font-semibold text-[#33251F] tabular-nums">
                  {b.progress}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
};
