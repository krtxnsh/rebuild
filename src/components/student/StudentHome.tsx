import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Compass,
  Flame,
  Star,
  Target,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import {
  LearningModule,
  Mission,
  StudentNavTab,
  StudentRecord,
  VillageBuilding,
} from '../../types/palampur';
import { AnimatedNumber, PersonAvatar } from '../common/BrandMark';
import { PalampurVillageCanvas } from '../three/PalampurVillageCanvas';

interface StudentHomeProps {
  student: StudentRecord;
  villageProgressPct: number;
  buildings: VillageBuilding[];
  todayMission: Mission;
  modules: LearningModule[];
  onNavigate: (tab: StudentNavTab) => void;
  onStartModule: (moduleId: string) => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({
  student,
  villageProgressPct,
  buildings,
  todayMission,
  modules,
  onNavigate,
  onStartModule,
}) => {
  const nextBuilding =
    buildings.find((b) => b.progress < 100) ?? buildings[buildings.length - 1];
  const recommendedModules = modules.filter((m) => !m.completed).slice(0, 3);
  const nextModule = recommendedModules[0];
  const modulesRemaining = Math.max(0, student.totalModules - student.modulesCompleted);
  const weeklyDeltaLabel = student.weeklyDelta >= 0 ? `+${student.weeklyDelta}%` : `${student.weeklyDelta}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="space-y-6"
    >
      {/* Personalized Welcome Banner */}
      <section className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <PersonAvatar name={student.name} variant={student.avatarVariant} size={64} />
          <div>
            <p className="text-xs font-medium text-[#C85A20]">
              Level {student.level} Explorer · {student.rollNo}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#33251F]">
              Hello, {student.name.split(' ')[0]}!
            </h1>
            <p className="text-sm text-[#75665C] mt-0.5">
              Keep learning to rebuild Palampur! Every challenge restores your valley.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-[#E97832]/15 text-[#C85A20] flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display text-lg font-bold text-[#33251F] tabular-nums">
                <AnimatedNumber value={student.streakDays} suffix=" Days" />
              </div>
              <div className="text-xs text-[#75665C]">Streak</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8AA43]/20 text-[#C85A20] flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display text-lg font-bold text-[#33251F] tabular-nums">
                <AnimatedNumber value={student.xp} suffix=" XP" />
              </div>
              <div className="text-xs text-[#75665C]">Total Earned</div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning pulse: a compact at-a-glance summary keeps the next decision obvious. */}
      <section aria-label="Learning pulse" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#65966A]/15 text-[#65966A] flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-[#33251F] tabular-nums">
              {student.overallScore}%
            </div>
            <div className="text-[11px] text-[#75665C]">Current score</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E8AA43]/20 text-[#C85A20] flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className={`font-display text-lg font-bold tabular-nums ${student.weeklyDelta >= 0 ? 'text-[#65966A]' : 'text-[#C94B3F]'}`}>
              {weeklyDeltaLabel}
            </div>
            <div className="text-[11px] text-[#75665C]">This week</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FFF6E9] border border-[#E9D9C7] text-[#C85A20] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-[#33251F] tabular-nums">
              {student.modulesCompleted}/{student.totalModules}
            </div>
            <div className="text-[11px] text-[#75665C]">Lessons complete</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E97832]/15 text-[#C85A20] flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-[#33251F] tabular-nums">
              {modulesRemaining}
            </div>
            <div className="text-[11px] text-[#75665C]">Lessons left</div>
          </div>
        </div>
      </section>

      {/* Main Split: 3D Village Progress + Today's Mission */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Village Progress Card with Live Interactive 3D Miniature */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#75665C]">
                Palampur Valley Restoration
              </p>
              <h2 className="font-display text-xl font-bold text-[#33251F] mt-0.5">
                Your Village Progress
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('village')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C85A20] hover:text-[#E97832] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Open Full 3D Village</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-5">
              <div className="font-display text-4xl font-extrabold text-[#33251F] tabular-nums">
                <AnimatedNumber value={villageProgressPct} suffix="%" />
              </div>
              <div className="mt-2.5 h-2.5 w-full rounded-full bg-[#F3E5D4] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#E97832] transition-all duration-500"
                  style={{ width: `${villageProgressPct}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-[#75665C] leading-relaxed">
                Just a bit more to restore{' '}
                <strong className="text-[#33251F]">{nextBuilding.name}</strong> ({nextBuilding.progress}%).
              </p>
            </div>

            <div
              onClick={() => onNavigate('village')}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onNavigate('village');
              }}
              aria-label="Open the full 3D village view"
              className="sm:col-span-7 h-52 rounded-xl border border-[#E9D9C7] overflow-hidden cursor-pointer relative group"
              title="Drag to orbit or click to explore full 3D village"
            >
              <PalampurVillageCanvas
                buildings={buildings}
                mode="preview"
                showDock={false}
              />
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-[#FFFDFA]/95 border border-[#E9D9C7] px-2.5 py-1 text-[11px] font-medium text-[#33251F]">
                Live 3D Preview · Drag to rotate
              </div>
            </div>
          </div>
        </div>

        {/* Today's Mission Card */}
        <div className="lg:col-span-5 rounded-2xl border border-[#E9D9C7] bg-[#FFF9F1] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#C85A20]">
                {todayMission.cadence} Mission · +{todayMission.xpReward} XP
              </span>
              <Trophy className="w-5 h-5 text-[#E97832]" />
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#33251F]">
              Today&apos;s Mission
            </h2>
            <p className="mt-2 text-sm text-[#75665C] leading-relaxed">
              {todayMission.description}
            </p>

            <div className="mt-5 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] p-4">
              <div className="flex items-center justify-between text-xs text-[#75665C]">
                <span>Impact on Village</span>
                <span className="font-mono font-semibold text-[#65966A] tabular-nums">
                  +{todayMission.villageBoostPct}% Restoration
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-[#F3E5D4] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#65966A] transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (todayMission.currentCount / Math.max(1, todayMission.targetCount)) * 100,
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#75665C]">
                <span>Mission progress</span>
                <span className="font-mono font-semibold text-[#33251F] tabular-nums">
                  {Math.min(todayMission.currentCount, todayMission.targetCount)}/{todayMission.targetCount}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onStartModule(todayMission.linkedModuleId ?? 'mod-water-safety')
            }
            className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] font-semibold text-sm transition-colors cursor-pointer"
          >
            <span>{todayMission.completed ? 'Practice Again' : 'Start Mission'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Quick Action Cards (Preserving My Lessons, Achievements, Leaderboard) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => onNavigate('learn')}
          className="text-left rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] hover:border-[#E97832] p-5 transition-colors flex items-center justify-between gap-4 cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FFF6E9] border border-[#E9D9C7] text-[#C85A20] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display font-bold text-[#33251F]">My Lessons</div>
              <div className="text-xs text-[#75665C] mt-0.5">
                Continue Learning · {student.modulesCompleted}/{student.totalModules} done
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#75665C] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('achievements')}
          className="text-left rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] hover:border-[#E97832] p-5 transition-colors flex items-center justify-between gap-4 cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FFF6E9] border border-[#E9D9C7] text-[#C85A20] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display font-bold text-[#33251F]">Achievements</div>
              <div className="text-xs text-[#75665C] mt-0.5">
                View Badges · {student.badgesUnlocked.length} unlocked
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#75665C] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('leaderboard')}
          className="text-left rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] hover:border-[#E97832] p-5 transition-colors flex items-center justify-between gap-4 cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FFF6E9] border border-[#E9D9C7] text-[#C85A20] flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display font-bold text-[#33251F]">Leaderboard</div>
              <div className="text-xs text-[#75665C] mt-0.5">Check Rankings · Class 6A</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#75665C] shrink-0" />
        </button>
      </section>

      {/* Continue Learning & Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#33251F]">
                Continue Learning
              </h2>
              {nextModule && (
                <p className="text-[11px] text-[#C85A20] mt-0.5">
                  Next best step · {nextModule.estimatedMinutes} min · +{nextModule.xpReward} XP
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('learn')}
              className="text-xs font-semibold text-[#C85A20] hover:underline cursor-pointer"
            >
              All Modules →
            </button>
          </div>
          <div className="divide-y divide-[#E9D9C7]">
            {recommendedModules.map((mod) => (
              <div
                key={mod.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs text-[#75665C]">
                    {mod.subject} · {mod.estimatedMinutes} min · +{mod.xpReward} XP
                  </div>
                  <div className="font-display font-semibold text-[#33251F] truncate">
                    {mod.title}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-1.5 w-32 rounded-full bg-[#F3E5D4] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#E97832]"
                        style={{ width: `${mod.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[#75665C] tabular-nums">
                      {mod.progress}%
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onStartModule(mod.id)}
                  className="px-4 py-2 rounded-lg bg-[#FFF6E9] hover:bg-[#E97832] text-[#33251F] hover:text-[#FFFDFA] border border-[#E9D9C7] hover:border-[#E97832] text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                >
                  {mod.progress > 0 ? 'Continue' : 'Start'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6">
          <h2 className="font-display text-lg font-bold text-[#33251F] mb-4">
            Recent Activity
          </h2>
          <div className="divide-y divide-[#E9D9C7]">
            {student.recentActivity.map((act) => (
              <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-[#75665C]">
                    {act.subject} · {act.timestamp}
                  </div>
                  <div className="text-sm font-medium text-[#33251F] truncate">
                    {act.title}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-semibold text-[#33251F] tabular-nums">
                    {act.scorePct}%
                  </div>
                  <div className="text-[11px] font-mono text-[#65966A] tabular-nums">
                    +{act.xpEarned} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
};
