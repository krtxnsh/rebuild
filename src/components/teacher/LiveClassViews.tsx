import { useState } from 'react';
import { ArrowRight, BookOpen, ClipboardCheck, Droplets, Users, Zap, Wheat } from 'lucide-react';
import { criLabels, MISCONCEPTIONS, misconceptionIds, MODULES, moduleIds, notebookParts, studentKey, summarize, type Progress } from '../../telemetry/protocol';
import type { classSnapshot } from '../../telemetry/analytics';
import type { StudentRecord } from '../../types/palampur';
import { PersonAvatar } from '../common/BrandMark';

const icons = { water: Droplets, power: Zap, ration: Wheat };
const colors = { water: '#536d76', power: '#a86521', ration: '#637548' };
const panel = 'rounded-2xl border border-[#e9d9c7] bg-[#fffdfa] p-5 sm:p-6';

function ProgressBar({ count, max, color }: { count: number; max: number; color: string }) {
  return <div className="h-2.5 overflow-hidden rounded-full bg-[#f2e8d9]" aria-hidden="true">
    <div className="h-full rounded-full motion-safe:transition-[width]" style={{ background: color, width: `${max ? 100 * count / max : 0}%` }} />
  </div>;
}

export function LiveClassOverview({ analytics, type, onOpenStudents }: {
  analytics: ReturnType<typeof classSnapshot>; type: 'overview' | 'analytics'; onOpenStudents: () => void;
}) {
  const { dataset, confidence, completions, misconceptionCounts, allPredictions } = analytics;
  const count = dataset.students.length;
  const totalRatings = confidence[1] + confidence[2] + confidence[3];
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-[#9b3b25]">{dataset.label}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{type === 'overview' ? 'Teacher Dashboard' : 'Class Analytics'}</h1>
        {type === 'overview' && <p className="mt-2 text-sm text-[#655346]">Welcome, {dataset.teacherName}. Follow your class as they rebuild Palampur.</p>}
      </header>
      {!count && <div className="rounded-2xl border border-[#c8cfb6] bg-[#eef0e3] p-4 text-sm text-[#3e4c30]">
        Your class roster is empty. Use <strong>Scan Student Work</strong> to import progress, or choose this class when starting a student session on this device.
      </div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          [count, 'Students', Users],
          [`${dataset.villageProgressPct}%`, 'Missions completed', BookOpen],
          [totalRatings, 'Confidence ratings', ClipboardCheck],
          [allPredictions.count ? `${Math.round(100 * allPredictions.correct / allPredictions.count)}%` : '—', 'Prediction accuracy', Zap],
        ] as const).map(([value, label, Icon]) => (
          <div key={String(label)} className={panel}>
            <Icon className="mb-2 text-[#a03720]" size={19} />
            <p className="text-2xl font-extrabold tabular-nums">{String(value)}</p>
            <p className="text-xs font-semibold text-[#655346] sm:text-sm">{String(label)}</p>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-4 min-[1100px]:grid-cols-2">
        <section className={panel} aria-labelledby="live-missions">
          <h2 id="live-missions" className="text-lg font-bold">Village missions</h2>
          <div className="mt-4 grid gap-4">
            {moduleIds.map(id => {
              const Icon = icons[id];
              return <div key={id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-semibold"><Icon size={16} style={{ color: colors[id] }} />{MODULES[id].title}</span>
                  <strong className="shrink-0 text-xs tabular-nums">{completions[id]} / {count} complete</strong>
                </div>
                <ProgressBar count={completions[id]} max={count} color={colors[id]} />
              </div>;
            })}
          </div>
        </section>
        <section className={panel} aria-labelledby="live-confidence">
          <h2 id="live-confidence" className="text-lg font-bold">Confidence ratings</h2>
          <div className="mt-4 grid gap-4">
            {([1, 2, 3] as const).map((cri, index) => <div key={cri}>
              <div className="mb-1.5 flex justify-between text-sm"><span>{criLabels[cri]}</span><strong>{confidence[cri]}</strong></div>
              <ProgressBar count={confidence[cri]} max={totalRatings} color={['#a06b44', '#a86521', '#637548'][index]} />
            </div>)}
          </div>
        </section>
      </div>
      <section className={panel} aria-labelledby="live-concepts">
        <h2 id="live-concepts" className="text-lg font-bold">Confirmed misconceptions</h2>
        <p className="mt-1 text-sm text-[#655346]">Students who chose the misconception and answered Very Sure.</p>
        <ul className="mt-3 divide-y divide-[#eee1d1]">
          {misconceptionIds.map(tag => <li key={tag} className="flex items-center justify-between gap-2 py-3 text-sm">
            <span>{MISCONCEPTIONS[tag].label}</span><strong className="shrink-0 rounded-full bg-[#f7e3d4] px-3 py-1 text-[#8c341f]">{misconceptionCounts[tag]} / {count}</strong>
          </li>)}
        </ul>
      </section>
      {type === 'overview' && count > 0 && <button type="button" className="sync-button" onClick={onOpenStudents}>Open student roster <ArrowRight size={17} /></button>}
    </div>
  );
}

export function LiveStudentDetail({ progress, student, onBack, onSaveNote }: {
  progress: Progress; student: StudentRecord; onBack: () => void; onSaveNote: (note: string) => void;
}) {
  const summary = summarize(progress.events);
  return (
    <div className="space-y-5" key={studentKey(student)}>
      <button type="button" className="sync-button" onClick={onBack}>Back to students</button>
      <header className="flex items-center gap-3">
        <PersonAvatar variant={student.avatarVariant} name={student.name} size={50} />
        <div><h1 className="text-2xl font-bold">{student.name}</h1><p className="text-sm text-[#655346]">Roll {student.rollNo}</p></div>
      </header>
      <section className={panel}>
        <h2 className="text-lg font-bold">Mission and notebook progress</h2>
        <ul className="mt-3 grid gap-2">
          {moduleIds.map(id => <li key={id} className="flex flex-wrap justify-between gap-2 text-sm">
            <span>{MODULES[id].title}</span>
            <strong>{summary.completed.has(id) ? 'Complete' : 'Incomplete'} · {notebookParts.filter(part => part.startsWith(id + '.') && summary.parts.has(part)).length}/{MODULES[id].parts.length} parts</strong>
          </li>)}
        </ul>
      </section>
      <section className={panel}>
        <h2 className="text-lg font-bold">Confidence and misconceptions</h2>
        <p className="mt-2 text-sm">{([1, 2, 3] as const).map(cri => `${criLabels[cri]}: ${summary.confidence.filter(value => value === cri).length}`).join(' · ')}</p>
        {summary.misconceptions.size ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {Array.from(summary.misconceptions, tag => <li key={tag}>{MISCONCEPTIONS[tag].label}</li>)}
        </ul> : <p className="mt-3 text-sm text-[#655346]">No confirmed misconceptions recorded.</p>}
      </section>
      <form className={panel} onSubmit={event => { event.preventDefault(); onSaveNote(String(new FormData(event.currentTarget).get('note') ?? '')); }}>
        <label className="grid gap-2 font-bold">Teacher note
          <textarea name="note" className="min-h-28 rounded-xl border border-[#d4bea2] bg-[#fff9ee] p-3 text-sm font-normal" maxLength={2000} defaultValue={student.teacherNote} />
        </label>
        <button type="submit" className="sync-button sync-button-primary mt-3">Save note</button>
      </form>
    </div>
  );
}



export function LiveStudentRoster({ students, onInspect }: { students: StudentRecord[]; onInspect: (student: StudentRecord) => void }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const rows = students.filter(student => (student.name + ' ' + student.rollNo).toLowerCase().includes(needle));
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-[#655346]">{students.length} in this class</p>
        </div>
        <label className="grid gap-1 text-sm font-bold">Find a student
          <input type="search" value={query} onChange={event => setQuery(event.currentTarget.value)}
            placeholder="Name or roll number" className="rounded-lg border border-[#d4bea2] bg-[#fff9ee] px-3 py-2 font-normal" />
        </label>
      </div>
      <div className={panel}>
        {rows.length === 0 ? <p className="text-sm text-[#655346]">
          {students.length ? 'No students match your search.' : 'Scan Student Work to add a student to this class.'}
        </p> : (
          <ul className="divide-y divide-[#eee1d1]">
            {rows.map(student => <li key={student.id}>
              <button type="button" className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg py-3 text-left hover:bg-[#fbf0df]" onClick={() => onInspect(student)}>
                <span className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <PersonAvatar variant={student.avatarVariant} name={student.name} size={34} />
                  <span className="min-w-0">
                    <strong className="block truncate text-sm sm:text-base">{student.name}</strong>
                    <span className="block truncate text-xs text-[#655346]">Roll {student.rollNo}</span>
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-right text-xs"><strong className="block">{student.modulesCompleted}/{student.totalModules} missions</strong>
                    {student.activeMisconceptions.length > 0 && <span className="text-[#923a26]">{student.activeMisconceptions.length} flagged</span>}
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            </li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
