import React, { lazy, Suspense, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
} from 'lucide-react';
import {
  Assignment,
  ClassDataset,
  Subject,
  VillageBuilding,
} from '../../types/palampur';
import { CircularProgressRing } from '../common/Charts';
const PalampurVillageCanvas = lazy(() => import('../three/PalampurVillageCanvas').then(module => ({ default: module.PalampurVillageCanvas })));

/* 1. ASSIGNMENTS VIEW */
export const AssignmentsView: React.FC<{
  dataset: ClassDataset;
  onCreateAssignment: (asg: Omit<Assignment, 'id' | 'submittedCount' | 'averageScore'>) => void;
}> = ({ dataset, onCreateAssignment }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<Subject>('Science');
  const [conceptFocus, setConceptFocus] = useState('Clear water is safe to drink');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateAssignment({
      title: title.trim(),
      subject,
      conceptFocus,
      dueDate,
      assignedTo: assignedTo === 'all' ? dataset.label : 'Students Needing Attention',
      totalCount: assignedTo === 'all' ? dataset.students.length : dataset.students.filter(student => student.status === 'Needs Attention').length,
      status: 'Active',
    });
    setTitle('');
    setShowForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#C85A20]">{dataset.label}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#33251F]">
            Class Assignments
          </h1>
          <p className="text-sm text-[#75665C] mt-0.5">
            Plan class activities and keep a record of targeted practice.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Cancel' : 'New Assignment'}</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[#33251F] mb-1">
              Assignment Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Boiling vs. Filtration Check"
              className="w-full px-3 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F] focus:outline-none focus:border-[#E97832]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#33251F] mb-1">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="w-full px-3 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F]"
            >
              <option value="Science">Science</option>
              <option value="Maths">Maths</option>
              <option value="English">English</option>
              <option value="EVS">EVS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#33251F] mb-1">
              Due Date
            </label>
            <input
              type="text"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F]"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[#33251F] mb-1">
              Concept Focus
            </label>
            <input
              type="text"
              value={conceptFocus}
              onChange={(e) => setConceptFocus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#33251F] mb-1">
              Target Group
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F]"
            >
              <option value="all">
                Entire Class ({dataset.students.length})
              </option>
              <option value="Students Needing Attention">
                Students Needing Attention
              </option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#33251F] hover:bg-[#4A372E] text-[#FFF9F1] text-xs font-semibold cursor-pointer"
            >
              Publish Assignment
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dataset.assignments.map((asg) => {
          const pct = Math.round((asg.submittedCount / Math.max(1, asg.totalCount)) * 100);
          return (
            <div
              key={asg.id}
              className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#75665C]">
                  <span>
                    {asg.subject} · Due {asg.dueDate}
                  </span>
                  <span
                    className={`font-semibold ${
                      asg.status === 'Completed' ? 'text-[#65966A]' : 'text-[#C85A20]'
                    }`}
                  >
                    {asg.status}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-lg font-bold text-[#33251F]">
                  {asg.title}
                </h2>
                <p className="mt-1 text-xs text-[#75665C]">
                  Concept: <strong className="text-[#33251F]">{asg.conceptFocus}</strong> ·{' '}
                  {asg.assignedTo}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E9D9C7]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[#75665C]">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Submissions: {asg.submittedCount}/{asg.totalCount}
                  </span>
                  <span className="font-mono font-semibold text-[#33251F] tabular-nums">
                    Avg {asg.averageScore}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#F3E5D4] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#E97832]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

/* 2. TEACHER VILLAGE PROGRESS 3D VIEW */
export const TeacherVillageView: React.FC<{
  dataset: ClassDataset;
  buildings: VillageBuilding[];
}> = ({ dataset, buildings }) => {
  const [selectedId, setSelectedId] = useState<string>(buildings[0].id);
  const selected = buildings.find((b) => b.id === selectedId) ?? buildings[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#C85A20]">{dataset.label}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#33251F]">
            Class Village Progress
          </h1>
          <p className="text-sm text-[#75665C] mt-0.5">
            Visualize how collective class mastery across subjects restores Palampur&apos;s
            landmarks.
          </p>
        </div>
        <div className="font-mono text-sm font-bold text-[#C85A20] tabular-nums">
          {dataset.villageProgressPct}% Collective Restoration
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-8 h-[460px] sm:h-[520px] rounded-2xl border border-[#E9D9C7] overflow-hidden">
          <Suspense fallback={<p role="status">Opening the village map…</p>}>
<PalampurVillageCanvas
            buildings={buildings}
            mode="interactive"
            selectedBuildingId={selectedId}
            onSelectBuilding={setSelectedId}
          />
</Suspense>
        </div>

        <div className="xl:col-span-4 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-[#33251F]">
                Landmark Breakdown
              </h2>
              <CircularProgressRing
                value={dataset.villageProgressPct}
                size={68}
                strokeWidth={7}
              />
            </div>

            <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4 mb-4">
              <div className="text-xs text-[#C85A20] font-semibold">
                {selected.category} · {selected.linkedSubject}
              </div>
              <div className="font-display text-base font-bold text-[#33251F] mt-0.5">
                {selected.name} ({selected.progress}%)
              </div>
              <p className="text-xs text-[#75665C] mt-1">{selected.communityBenefit}</p>
            </div>

            <div className="space-y-2">
              {buildings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    b.id === selectedId
                      ? 'border-[#E97832] bg-[#FFF6E9] font-semibold text-[#33251F]'
                      : 'border-[#E9D9C7] bg-[#FFFDFA] text-[#75665C] hover:text-[#33251F]'
                  }`}
                >
                  <span className="truncate">{b.name}</span>
                  <span className="font-mono tabular-nums ml-2">{b.progress}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* 3. PRINT-READY REPORTS & PDF EXPORTS */
export const ReportsView: React.FC<{
  dataset: ClassDataset;
  buildings: VillageBuilding[];
}> = ({ dataset, buildings }) => {
  const total = dataset.students.length;
  const avgCompletion = Math.round(
    dataset.students.reduce((a, s) => a + s.completionRate, 0) / Math.max(1, total),
  );
  const avgScore = Math.round(
    dataset.students.reduce((a, s) => a + s.overallScore, 0) / Math.max(1, total),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <p className="text-xs font-medium text-[#C85A20]">{dataset.label}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#33251F]">
            Diagnostic Reports & Exports
          </h1>
          <p className="text-sm text-[#75665C] mt-0.5">
            Download formatted PDF summaries, CSV student tables, or print directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void import('../../utils/pdfExport').then(reports => reports.exportClassCSV(dataset))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF9F1] text-xs font-semibold text-[#33251F] cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#65966A]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF9F1] text-xs font-semibold text-[#33251F] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>

          <button
            type="button"
            onClick={() => void import('../../utils/pdfExport').then(reports => reports.exportTeacherReportPDF(dataset, buildings))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Print-Friendly Executive Report Document */}
      <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-8 space-y-8 print-break-inside-avoid">
        <div className="border-b border-[#E9D9C7] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#C85A20]">
              REBUILD — PALAMPUR · DIAGNOSTIC DOSSIER
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#33251F]">
              {dataset.schoolName} — {dataset.gradeLabel}
            </h2>
            <p className="text-xs text-[#75665C] mt-1">
              Prepared for {dataset.teacherName} · Report Date: November 17, 2026
            </p>
          </div>
          <div className="text-right font-mono text-xs text-[#75665C]">
            Village Restoration: <strong className="text-[#33251F]">{dataset.villageProgressPct}%</strong>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4">
            <div className="text-xs text-[#75665C]">Total Enrolled</div>
            <div className="font-display text-2xl font-bold text-[#33251F] tabular-nums mt-1">
              {total}
            </div>
          </div>
          <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4">
            <div className="text-xs text-[#75665C]">Avg. Completion</div>
            <div className="font-display text-2xl font-bold text-[#33251F] tabular-nums mt-1">
              {avgCompletion}%
            </div>
          </div>
          <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4">
            <div className="text-xs text-[#75665C]">Overall Score</div>
            <div className="font-display text-2xl font-bold text-[#E97832] tabular-nums mt-1">
              {avgScore}%
            </div>
          </div>
          <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-4">
            <div className="text-xs text-[#75665C]">Class Confidence</div>
            <div className="font-display text-2xl font-bold text-[#65966A] tabular-nums mt-1">
              {dataset.classConfidencePct}%
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-display text-base font-bold text-[#33251F] mb-3">
            Priority Concept Misconceptions
          </h3>
          <div className="divide-y divide-[#E9D9C7] border border-[#E9D9C7] rounded-xl overflow-hidden">
            {dataset.conceptInsights.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-[#FFFDFA] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-[#33251F]">{c.conceptTitle}</div>
                  <div className="text-[#75665C] mt-0.5">{c.suggestedClassroomActivity}</div>
                </div>
                <div className="font-mono text-[#C94B3F] font-semibold shrink-0 tabular-nums">
                  {c.holdIdeaCount} hold idea · {c.fragileCount} fragile · {c.secureCount} secure
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
