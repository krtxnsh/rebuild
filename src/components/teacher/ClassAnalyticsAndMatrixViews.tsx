import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  Award,
  CheckCircle2,
  Download,
  Search,
  Send,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Achievement,
  ClassDataset,
  StudentRecord,
  Subject,
  VillageBuilding,
} from '../../types/palampur';
import { PersonAvatar } from '../common/BrandMark';
import {
  CircularProgressRing,
  PerformanceLineChart,
  SubjectBarChart,
} from '../common/Charts';

/* 1. CLASS ANALYTICS VIEW (Preserves Screenshot 6) */
export const ClassAnalyticsView: React.FC<{
  dataset: ClassDataset;
  buildings: VillageBuilding[];
  onInspectStudent: (student: StudentRecord) => void;
}> = ({ dataset, buildings, onInspectStudent }) => {
  const [range, setRange] = useState<'Last 7 Days' | 'Last 30 Days' | 'This Term'>('Last 30 Days');

  const total = dataset.students.length;
  const onTrackCount = dataset.students.filter((s) => s.status === 'On Track').length;
  const needAttentionCount = total - onTrackCount;

  const avgBySubject: Record<Subject, number> = {
    Maths: Math.round(dataset.students.reduce((a, s) => a + s.subjects.Maths, 0) / Math.max(1, total)),
    Science: Math.round(dataset.students.reduce((a, s) => a + s.subjects.Science, 0) / Math.max(1, total)),
    English: Math.round(dataset.students.reduce((a, s) => a + s.subjects.English, 0) / Math.max(1, total)),
    EVS: Math.round(dataset.students.reduce((a, s) => a + s.subjects.EVS, 0) / Math.max(1, total)),
  };
  const overallAvg = Math.round(
    (avgBySubject.Maths + avgBySubject.Science + avgBySubject.English + avgBySubject.EVS) / 4,
  );

  const chartLabels =
    range === 'Last 7 Days'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : range === 'Last 30 Days'
        ? ['Jun 1', 'Jun 8', 'Jun 15', 'Jun 22', 'Jun 30']
        : ['Aug', 'Sep', 'Oct', 'Nov'];

  const chartValues =
    range === 'Last 7 Days'
      ? [64, 68, 71, 73, 76, 80, overallAvg]
      : range === 'Last 30 Days'
        ? [52, 65, 71, 82, overallAvg]
        : [56, 64, 72, overallAvg];

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
            Class Analytics
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Analytics timeframe"
            value={range}
            onChange={(e) =>
              setRange(e.target.value as 'Last 7 Days' | 'Last 30 Days' | 'This Term')
            }
            className="px-3.5 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] text-xs font-semibold text-[#33251F] focus:outline-none focus:border-[#E97832]"
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Term">This Term</option>
          </select>

          <button
            type="button"
            onClick={() => void import('../../utils/pdfExport').then(reports => reports.exportTeacherReportPDF(dataset, buildings))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main 3-Panel Analytics Grid matching Screenshot 6 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Overall Class Performance */}
        <div className="xl:col-span-6 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#33251F]">
                Overall Class Performance
              </h2>
              <p className="text-xs text-[#75665C]">
                Mean mastery progression ({range})
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#C85A20] tabular-nums">
              Peak: {Math.max(...chartValues)}%
            </span>
          </div>

          <PerformanceLineChart
            labels={chartLabels}
            series={[{ name: 'Class Mean', color: '#E97832', values: chartValues }]}
            highlightIndex={range === 'Last 30 Days' ? 3 : chartValues.length - 1}
            height={220}
          />
        </div>

        {/* Performance by Subject */}
        <div className="xl:col-span-3 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col justify-between">
          <h2 className="font-display text-lg font-bold text-[#33251F]">
            Performance by Subject
          </h2>
          <div className="my-4 flex justify-center">
            <CircularProgressRing
              value={overallAvg}
              size={126}
              strokeWidth={12}
              sublabel="Overall"
            />
          </div>
          <div className="space-y-2.5 text-sm">
            {(['Maths', 'Science', 'English', 'EVS'] as const).map((subj) => (
              <div key={subj} className="flex items-center justify-between">
                <span className="text-[#75665C]">{subj}</span>
                <span className="font-mono font-bold text-[#33251F] tabular-nums">
                  {avgBySubject[subj]}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Class Summary */}
        <div className="xl:col-span-3 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#33251F]">
              Class Summary
            </h2>
            <p className="text-xs text-[#75665C] mt-0.5">Cohort readiness breakdown</p>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-3.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-[#33251F]">
                  <Users className="w-4 h-4 text-[#C85A20]" />
                  Total Students
                </span>
                <span className="font-mono font-bold text-base text-[#33251F] tabular-nums">
                  {total}
                </span>
              </div>

              <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-3.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-[#33251F]">
                  <CheckCircle2 className="w-4 h-4 text-[#65966A]" />
                  On Track
                </span>
                <span className="font-mono font-bold text-base text-[#65966A] tabular-nums">
                  {onTrackCount}
                </span>
              </div>

              <div className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-3.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-[#33251F]">
                  <AlertTriangle className="w-4 h-4 text-[#C94B3F]" />
                  Need Attention
                </span>
                <span className="font-mono font-bold text-base text-[#C94B3F] tabular-nums">
                  {needAttentionCount}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const lowest = [...dataset.students].sort(
                (a, b) => a.overallScore - b.overallScore,
              )[0];
              if (lowest) onInspectStudent(lowest);
            }}
            className="mt-5 w-full py-2.5 px-3 rounded-xl border border-[#E9D9C7] hover:border-[#E97832] bg-[#FFF9F1] text-xs font-semibold text-[#33251F] transition-colors cursor-pointer"
          >
            Inspect Lowest Mastery Student →
          </button>
        </div>
      </div>

      {/* Subject Comparison Bars */}
      <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6">
        <h2 className="font-display text-lg font-bold text-[#33251F] mb-1">
          Subject-wise Distribution
        </h2>
        <p className="text-xs text-[#75665C] mb-2">
          Average score across {total} students in {dataset.label}
        </p>
        <SubjectBarChart
          height={190}
          items={[
            { label: 'Maths', value: avgBySubject.Maths, color: '#E97832' },
            { label: 'Science', value: avgBySubject.Science, color: '#F5A34A' },
            { label: 'English', value: avgBySubject.English, color: '#C85A20' },
            { label: 'EVS', value: avgBySubject.EVS, color: '#65966A' },
          ]}
        />
      </div>
    </motion.div>
  );
};

/* 2. STUDENT PERFORMANCE MATRIX (ALL 30 STUDENTS, SEARCH, FILTER, SORT) */
type SortField = 'name' | 'overallScore' | 'Maths' | 'Science' | 'English' | 'EVS' | 'completionRate';

export const StudentPerformanceMatrix: React.FC<{
  dataset: ClassDataset;
  onInspectStudent: (student: StudentRecord) => void;
}> = ({ dataset, onInspectStudent }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | StudentRecord['status']>('All');
  const [sortField, setSortField] = useState<SortField>('overallScore');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(field === 'name');
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.students
      .filter((s) => {
        const matchText =
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All' || s.status === statusFilter;
        return matchText && matchStatus;
      })
      .sort((a, b) => {
        let va: string | number = 0;
        let vb: string | number = 0;
        if (sortField === 'name') {
          va = a.name;
          vb = b.name;
          return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        if (
          sortField === 'Maths' ||
          sortField === 'Science' ||
          sortField === 'English' ||
          sortField === 'EVS'
        ) {
          va = a.subjects[sortField];
          vb = b.subjects[sortField];
        } else {
          va = a[sortField];
          vb = b[sortField];
        }
        return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
      });
  }, [dataset.students, search, statusFilter, sortField, sortAsc]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#C85A20]">
            {dataset.label} · {dataset.students.length} Enrolled Students
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#33251F]">
            Student Performance Matrix
          </h1>
          <p className="text-sm text-[#75665C] mt-1">
            Filter, sort, and click any student row to inspect concept mastery and
            misconceptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#75665C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or roll..."
              className="pl-8 pr-3 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] text-xs text-[#33251F] focus:outline-none focus:border-[#E97832]"
            />
          </div>

          <div className="inline-flex items-center p-1 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA]">
            {(['All', 'On Track', 'Fragile', 'Needs Attention'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#E97832] text-[#FFFDFA]'
                    : 'text-[#75665C] hover:text-[#33251F]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* High-density sticky-header table */}
      <div className="rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-[#FFF9F1] border-b border-[#E9D9C7] text-xs font-semibold text-[#75665C]">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-[#33251F] cursor-pointer"
                  >
                    <span>Student</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Status</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('overallScore')}
                    className="inline-flex items-center gap-1 hover:text-[#33251F] cursor-pointer"
                  >
                    <span>Overall</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                {(['Maths', 'Science', 'English', 'EVS'] as const).map((subj) => (
                  <th key={subj} className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort(subj)}
                      className="inline-flex items-center gap-1 hover:text-[#33251F] cursor-pointer"
                    >
                      <span>{subj}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                ))}
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('completionRate')}
                    className="inline-flex items-center gap-1 hover:text-[#33251F] cursor-pointer"
                  >
                    <span>Modules</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Misconceptions</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E9D9C7]">
              {rows.map((stu) => (
                <tr
                  key={stu.id}
                  onClick={() => onInspectStudent(stu)}
                  className="hover:bg-[#FFF6E9] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={stu.name} variant={stu.avatarVariant} size={32} />
                      <div>
                        <div className="font-semibold text-[#33251F]">{stu.name}</div>
                        <div className="text-[11px] font-mono text-[#75665C]">{stu.rollNo}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap text-xs font-semibold">
                    {stu.status === 'On Track' ? (
                      <span className="inline-flex items-center gap-1 text-[#4F7B54]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> On Track
                      </span>
                    ) : stu.status === 'Fragile' ? (
                      <span className="inline-flex items-center gap-1 text-[#B57B1B]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Fragile
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#C94B3F]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Needs Attention
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-[#33251F] tabular-nums">
                    {stu.overallScore}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-[#33251F] tabular-nums">
                    {stu.subjects.Maths}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-[#33251F] tabular-nums">
                    {stu.subjects.Science}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-[#33251F] tabular-nums">
                    {stu.subjects.English}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-[#33251F] tabular-nums">
                    {stu.subjects.EVS}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-[#75665C] tabular-nums">
                    {stu.completionRate}%
                  </td>
                  <td className="py-3 px-3 text-xs text-[#75665C] max-w-[200px] truncate">
                    {stu.activeMisconceptions.length > 0
                      ? `${stu.activeMisconceptions.length} flagged (${stu.activeMisconceptions[0]})`
                      : 'None detected'}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectStudent(stu);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#FFF6E9] hover:bg-[#E97832] text-[#33251F] hover:text-[#FFFDFA] border border-[#E9D9C7] hover:border-[#E97832] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-[#75665C]">
                    No students match your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

/* 3. INDIVIDUAL STUDENT DETAIL ANALYTICS */
export const StudentDetailView: React.FC<{
  student: StudentRecord;
  achievements: Achievement[];
  onBack: () => void;
  onSaveNote: (studentId: string, note: string) => void;
}> = ({ student, achievements, onBack, onSaveNote }) => {
  const [timeframe, setTimeframe] = useState<'1 Week' | '1 Month' | '3 Months'>('1 Month');
  const [noteText, setNoteText] = useState(student.teacherNote ?? '');
  const [noteSaved, setNoteSaved] = useState(false);

  const studentAchievements = achievements.filter((a) =>
    student.badgesUnlocked.includes(a.id),
  );

  const seriesValues =
    timeframe === '1 Week'
      ? student.weeklySeries
      : timeframe === '1 Month'
        ? student.monthlySeries
        : [Math.max(30, student.overallScore - 18), Math.max(35, student.overallScore - 12), Math.max(38, student.overallScore - 6), student.overallScore];

  const seriesLabels =
    timeframe === '1 Week'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : timeframe === '1 Month'
        ? ['Jun 1', 'Jun 8', 'Jun 15', 'Jun 22', 'Jun 30']
        : ['Sep', 'Oct', 'Nov 1', 'Nov 17'];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNote(student.id, noteText);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF9F1] text-[#33251F] transition-colors cursor-pointer"
            aria-label="Back to student list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <PersonAvatar name={student.name} variant={student.avatarVariant} size={52} />
          <div>
            <div className="text-xs font-medium text-[#C85A20]">
              {student.rollNo} · {student.status} · Level {student.level}
            </div>
            <h1 className="font-display text-2xl font-bold text-[#33251F]">
              {student.name}
            </h1>
          </div>
        </div>

        <div className="inline-flex items-center p-1 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA]">
          {(['1 Week', '1 Month', '3 Months'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                timeframe === tf
                  ? 'bg-[#E97832] text-[#FFFDFA]'
                  : 'text-[#75665C] hover:text-[#33251F]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Overview + Subject Bars + Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[#33251F]">
              Progress Overview
            </h2>
            <div className="mt-4 flex items-center gap-5">
              <CircularProgressRing value={student.overallScore} size={108} strokeWidth={10} />
              <div>
                <div className="text-xs text-[#75665C]">Overall Mastery</div>
                <div className="font-display text-2xl font-bold text-[#33251F] tabular-nums">
                  {student.overallScore}%
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#65966A]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {student.weeklyDelta >= 0 ? `+${student.weeklyDelta}%` : `${student.weeklyDelta}%`} from last month
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <PerformanceLineChart
              labels={seriesLabels}
              series={[{ name: 'Score', color: '#E97832', values: seriesValues }]}
              height={150}
            />
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 flex flex-col justify-between">
          <h2 className="font-display text-base font-bold text-[#33251F]">
            Subject-wise Performance
          </h2>
          <SubjectBarChart
            height={215}
            items={[
              { label: 'Maths', value: student.subjects.Maths, color: '#E97832' },
              { label: 'Science', value: student.subjects.Science, color: '#F5A34A' },
              { label: 'English', value: student.subjects.English, color: '#C85A20' },
              { label: 'EVS', value: student.subjects.EVS, color: '#65966A' },
            ]}
          />
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#33251F]">
            Achievements & Stats
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#E9D9C7]">
              <span className="text-[#75665C]">Total XP</span>
              <strong className="font-mono text-[#33251F] tabular-nums">{student.xp} XP</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E9D9C7]">
              <span className="text-[#75665C]">Streak</span>
              <strong className="font-mono text-[#33251F] tabular-nums">{student.streakDays} Days</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E9D9C7]">
              <span className="text-[#75665C]">Modules Completed</span>
              <strong className="font-mono text-[#33251F] tabular-nums">
                {student.modulesCompleted}/{student.totalModules}
              </strong>
            </div>
          </div>

          <div className="space-y-2">
            {studentAchievements.map((ach) => (
              <div
                key={ach.id}
                className="rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-2.5 flex items-center gap-2.5"
              >
                <Award className="w-4 h-4 text-[#E97832] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#33251F] truncate">{ach.title}</div>
                  <div className="text-[11px] text-[#75665C] truncate">{ach.criteria}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Misconceptions + Learning History + Teacher Note */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6">
          <h2 className="font-display text-base font-bold text-[#33251F] mb-3">
            Detected Misconceptions & Concept Map
          </h2>
          {student.activeMisconceptions.length > 0 ? (
            <div className="space-y-2.5">
              {student.activeMisconceptions.map((m) => (
                <div
                  key={m}
                  className="rounded-xl border border-[#C94B3F]/30 bg-[#C94B3F]/8 p-3.5 flex items-start gap-2.5 text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-[#C94B3F] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#33251F]">{m}</div>
                    <div className="text-[#75665C] mt-0.5">
                      Recommended: Assign guided visual check before unit assessment.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#65966A]/35 bg-[#65966A]/10 p-4 text-xs text-[#33251F] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#65966A]" />
              <span>No active misconceptions detected across core concepts.</span>
            </div>
          )}

          <h3 className="font-display text-sm font-bold text-[#33251F] mt-5 mb-2">
            Recent Learning History
          </h3>
          <div className="divide-y divide-[#E9D9C7]">
            {student.recentActivity.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-[#33251F]">{act.title}</div>
                  <div className="text-[#75665C]">
                    {act.subject} · {act.timestamp}
                  </div>
                </div>
                <span className="font-mono font-semibold text-[#33251F] tabular-nums">
                  {act.scorePct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] p-6">
          <h2 className="font-display text-base font-bold text-[#33251F] mb-2">
            Teacher Intervention Notes
          </h2>
          <p className="text-xs text-[#75665C] mb-4">
            Record targeted guidance for {student.name} to track progress across weekly
            check-ins.
          </p>
          <form onSubmit={handleSave} className="space-y-3">
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={`Add intervention plan for ${student.name}...`}
              className="w-full rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] p-3.5 text-sm text-[#33251F] placeholder:text-[#75665C] focus:outline-none focus:border-[#E97832]"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#65966A] font-medium">
                {noteSaved ? 'Intervention note saved.' : ''}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Intervention Note</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};
