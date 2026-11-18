import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Download,
  Droplets,
  Lightbulb,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  ClassDataset,
  ConceptInsight,
  StudentRecord,
  VillageBuilding,
} from '../../types/palampur';
import { PersonAvatar } from '../common/BrandMark';
import { SparklineTrend } from '../common/Charts';

/* 1. TEACHING RECOMMENDATIONS ("WHAT TO TEACH NEXT") */
export const TeachingRecommendationsView: React.FC<{
  dataset: ClassDataset;
  buildings: VillageBuilding[];
  isSampleClass: boolean;
  onToggleSampleClass: () => void;
  onInspectStudent: (student: StudentRecord) => void;
  onAssignRemediation: (concept: ConceptInsight) => void;
}> = ({
  dataset,
  buildings,
  isSampleClass,
  onToggleSampleClass,
  onInspectStudent,
  onAssignRemediation,
}) => {
  const [activeLessonConcept, setActiveLessonConcept] = useState<ConceptInsight | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>('All');
  const [taughtIds, setTaughtIds] = useState<string[]>([]);

  const visibleConcepts =
    domainFilter === 'All'
      ? dataset.conceptInsights
      : dataset.conceptInsights.filter((c) => c.domain === domainFilter);

  const uniqueDomains = Array.from(new Set(dataset.conceptInsights.map((c) => c.domain)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header matching Screenshot 4 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#C85A20]">
            Diagnostic Teaching Engine · {dataset.label}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#33251F]">
            Teaching Recommendations
          </h1>
          <p className="text-sm text-[#75665C] mt-0.5">
            Personalized suggestions based on student performance and detected misconceptions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggleSampleClass}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              isSampleClass
                ? 'border-[#E97832] bg-[#FFF6E9] text-[#C85A20]'
                : 'border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF9F1] text-[#33251F]'
            }`}
          >
            {isSampleClass ? 'Return to my class' : 'Show Sample Class'}
          </button>

          <button
            type="button"
            onClick={() => void import('../../utils/pdfExport').then(reports => reports.exportTeacherReportPDF(dataset, buildings))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Split: What to teach next + Quick Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Concept Recommendation Cards */}
        <div className="xl:col-span-8 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E8AA43]/20 text-[#C85A20] flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#33251F]">
                What to teach next
              </h2>
            </div>

            {domainFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setDomainFilter('All')}
                className="text-xs font-semibold text-[#C85A20] hover:underline cursor-pointer"
              >
                Show all topics ({dataset.conceptInsights.length})
              </button>
            )}
          </div>

          <div className="space-y-4">
            {visibleConcepts.map((c) => {
              const total = Math.max(
                1,
                c.holdIdeaCount + c.fragileCount + c.secureCount + c.notSeenCount,
              );
              const isTaught = taughtIds.includes(c.id);
              const Icon = c.domain === 'Water Safety' ? Droplets : c.domain === 'Electricity' ? Zap : BookOpen;

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-5 transition-colors hover:border-[#E97832]/70"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#C85A20] shrink-0" />
                        <h3 className="font-display text-base font-bold text-[#33251F]">
                          {c.conceptTitle}
                        </h3>
                        {isTaught && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#65966A]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                          </span>
                        )}
                      </div>

                      {/* Segmented mastery distribution bar */}
                      <div className="mt-3 h-2 w-full rounded-full bg-[#E9D9C7] overflow-hidden flex">
                        <div
                          style={{ width: `${(c.holdIdeaCount / total) * 100}%` }}
                          className="bg-[#C94B3F] h-full"
                          title={`Hold misconception: ${c.holdIdeaCount}`}
                        />
                        <div
                          style={{ width: `${(c.fragileCount / total) * 100}%` }}
                          className="bg-[#E8AA43] h-full"
                          title={`Fragile: ${c.fragileCount}`}
                        />
                        <div
                          style={{ width: `${(c.secureCount / total) * 100}%` }}
                          className="bg-[#65966A] h-full"
                          title={`Secure: ${c.secureCount}`}
                        />
                      </div>

                      {/* Explicit accessible counts (unboxed clean metadata with color indicators) */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium tabular-nums">
                        <span className="text-[#C94B3F] font-semibold">
                          {c.holdIdeaCount} hold this idea
                        </span>
                        <span className="text-[#B57B1B] font-semibold">
                          {c.fragileCount} fragile
                        </span>
                        <span className="text-[#4F7B54] font-semibold">
                          {c.secureCount} secure
                        </span>
                        <span className="text-[#75665C]">{c.notSeenCount} not seen</span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-[#C94B3F]">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {c.unsureCount} students are unsure!{' '}
                          {c.severity === 'High'
                            ? 'Focus on this concept.'
                            : 'Review before next unit.'}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[#75665C] leading-relaxed">
                        <strong className="text-[#33251F]">Activity:</strong>{' '}
                        {c.suggestedClassroomActivity}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveLessonConcept(c)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Start Teaching</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Quick Insights Panel */}
        <div className="xl:col-span-4 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 space-y-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#C85A20]" />
            <h2 className="font-display text-lg font-bold text-[#33251F]">Quick Insights</h2>
          </div>

          <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-5">
            <div className="text-xs font-medium text-[#75665C]">{dataset.id === 'live-class' ? 'Very Sure ratings' : 'Class Confidence'}</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="font-display text-3xl font-extrabold text-[#33251F] tabular-nums">
                  {dataset.classConfidencePct}%
                </div>
                {dataset.id !== 'live-class' && <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#65966A]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{dataset.classConfidenceDelta}%</span>
                </div>}
              </div>
              {dataset.id !== 'live-class' && <SparklineTrend values={[58, 63, 61, 69, 73, 76, dataset.classConfidencePct]} />}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-[#33251F] mb-2.5">
              Common Misconceptions (Filter)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDomainFilter('All')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  domainFilter === 'All'
                    ? 'bg-[#33251F] border-[#33251F] text-[#FFF9F1]'
                    : 'bg-[#FFF9F1] border-[#E9D9C7] text-[#33251F] hover:border-[#E97832]'
                }`}
              >
                All Domains
              </button>
              {uniqueDomains.map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setDomainFilter(dom)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    domainFilter === dom
                      ? 'bg-[#E97832] border-[#E97832] text-[#FFFDFA]'
                      : 'bg-[#FFF9F1] border-[#E9D9C7] text-[#33251F] hover:border-[#E97832]'
                  }`}
                >
                  {dom}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E9D9C7] text-xs text-[#75665C] leading-relaxed">
            Click <strong className="text-[#33251F]">Start Teaching</strong> on any concept to
            view the guided classroom demonstration, inspect affected students, and assign
            practice directly.
          </div>
        </div>
      </div>

      {/* Classroom Activity & Intervention Modal */}
      {activeLessonConcept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#33251F]/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E9D9C7] bg-[#FFF9F1] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#C85A20]">
                  {activeLessonConcept.domain} · {activeLessonConcept.activityDurationMin} min
                  Classroom Plan
                </div>
                <h3 className="font-display text-lg font-bold text-[#33251F]">
                  {activeLessonConcept.conceptTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLessonConcept(null)}
                aria-label="Close teaching guide"
                className="p-1.5 rounded-lg text-[#75665C] hover:text-[#33251F] hover:bg-[#FFF6E9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4">
                  <div className="text-xs font-semibold text-[#C94B3F] mb-1">
                    Student Mental Model
                  </div>
                  <p className="text-xs text-[#33251F] leading-relaxed">
                    {activeLessonConcept.studentMentalModel}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4">
                  <div className="text-xs font-semibold text-[#4F7B54] mb-1">
                    Scientific Model to Build
                  </div>
                  <p className="text-xs text-[#33251F] leading-relaxed">
                    {activeLessonConcept.scientificModel}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] p-4">
                <div className="text-xs font-semibold text-[#C85A20] mb-1">
                  Recommended Classroom Activity
                </div>
                <p className="text-sm text-[#33251F] leading-relaxed">
                  {activeLessonConcept.suggestedClassroomActivity}
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#33251F] mb-2">
                  Affected Students ({activeLessonConcept.affectedStudentIds.length}) — Click
                  to inspect
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeLessonConcept.affectedStudentIds.map((sid) => {
                    const stu = dataset.students.find((s) => s.id === sid);
                    if (!stu) return null;
                    return (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => {
                          setActiveLessonConcept(null);
                          onInspectStudent(stu);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E9D9C7] bg-[#FFF9F1] hover:border-[#E97832] text-xs font-medium text-[#33251F] cursor-pointer"
                      >
                        <PersonAvatar name={stu.name} variant={stu.avatarVariant} size={20} />
                        <span>{stu.name}</span>
                        <span className="font-mono text-[#C94B3F]">{stu.overallScore}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E9D9C7] bg-[#FFF9F1] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveLessonConcept(null)}
                className="px-4 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] text-xs font-semibold text-[#33251F] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onAssignRemediation(activeLessonConcept);
                  setTaughtIds((prev) =>
                    prev.includes(activeLessonConcept.id)
                      ? prev
                      : [...prev, activeLessonConcept.id],
                  );
                  setActiveLessonConcept(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assign Targeted Practice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* 2. DEDICATED MISCONCEPTIONS DIAGNOSTICS VIEW */
export const MisconceptionsView: React.FC<{
  dataset: ClassDataset;
  onInspectStudent: (student: StudentRecord) => void;
  onAssignRemediation: (concept: ConceptInsight) => void;
}> = ({ dataset, onInspectStudent, onAssignRemediation }) => {
  const [severityFilter, setSeverityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  const items = dataset.conceptInsights.filter(
    (c) => severityFilter === 'All' || c.severity === severityFilter,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#C85A20]">
            Intelligent Learning Diagnostics · {dataset.label}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#33251F]">
            Misconception Detection
          </h1>
          <p className="text-sm text-[#75665C] mt-1">
            Root-cause analysis of recurring conceptual errors, severity levels, and
            student-level intervention rosters.
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA]">
          {(['All', 'High', 'Medium', 'Low'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                severityFilter === sev
                  ? 'bg-[#33251F] text-[#FFF9F1]'
                  : 'text-[#75665C] hover:text-[#33251F]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {items.map((item) => {
          const affected = dataset.students.filter((s) =>
            item.affectedStudentIds.includes(s.id),
          );
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-[#75665C]">
                    {item.subject} · {item.domain} ·{' '}
                    <span
                      className={`font-semibold ${
                        item.severity === 'High'
                          ? 'text-[#C94B3F]'
                          : item.severity === 'Medium'
                            ? 'text-[#C85A20]'
                            : 'text-[#65966A]'
                      }`}
                    >
                      {item.severity} Severity
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#33251F]">
                    &ldquo;{item.misconceptionStatement}&rdquo;
                  </h2>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="font-mono text-xl font-bold text-[#C94B3F] tabular-nums">
                      {item.holdIdeaCount} students
                    </div>
                    <div className="text-xs text-[#75665C]">
                      Confidence: {item.confidenceScore}%
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAssignRemediation(item)}
                    className="px-4 py-2.5 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Assign Intervention
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4">
                  <div className="text-xs font-semibold text-[#C94B3F] mb-1">
                    Observed Mental Model
                  </div>
                  <p className="text-xs text-[#33251F] leading-relaxed">
                    {item.studentMentalModel}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4">
                  <div className="text-xs font-semibold text-[#4F7B54] mb-1">
                    Suggested Intervention ({item.activityDurationMin} min)
                  </div>
                  <p className="text-xs text-[#33251F] leading-relaxed">
                    {item.suggestedClassroomActivity}
                  </p>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#75665C] mb-2">
                  Affected Students ({affected.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {affected.map((stu) => (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => onInspectStudent(stu)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E9D9C7] bg-[#FFFDFA] hover:border-[#E97832] text-xs font-medium text-[#33251F] transition-colors cursor-pointer"
                    >
                      <PersonAvatar name={stu.name} variant={stu.avatarVariant} size={20} />
                      <span>{stu.name}</span>
                      <span className="font-mono text-[#75665C]">{stu.overallScore}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
