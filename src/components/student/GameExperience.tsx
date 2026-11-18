import { lazy, Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, QrCode } from 'lucide-react';
import { isRecord, moduleIds, MODULES, parseStudent, parseTelemetry, studentKey, summarize, type ModuleId, type Progress } from '../../telemetry/protocol';
import { recordProgress } from '../../telemetry/store';
import { Modal } from '../common/Modal';

const ExportProgress = lazy(() => import('../ExportProgress').then(module => ({ default: module.ExportProgress })));
const villageUrl = (chapter: ModuleId) => `${import.meta.env.BASE_URL}preview/?embed=1&chapter=${chapter}`;

export function GameExperience({ progress, classroomId, classroomLabel, onExit }: {
  progress: Progress; classroomId: string; classroomLabel?: string; onExit: () => void;
}) {
  const { student } = progress;
  const [exporting, setExporting] = useState<Progress | null>(null);
  const [review, setReview] = useState(false);
  const summary = useMemo(() => summarize(progress.events), [progress.events]);
  const [start] = useState(() => moduleIds.find(chapter => !summary.completed.has(chapter)) ?? moduleIds[0]);
  const frame = useRef<HTMLIFrameElement>(null);
  const current = useRef({ progress, classroomId, summary });
  useLayoutEffect(() => {
    current.current = { progress, classroomId, summary };
  }, [progress, classroomId, summary]);

  useLayoutEffect(() => {
    const origin = new URL(villageUrl(start), document.baseURI).origin;
    const handleMessage = (message: MessageEvent<unknown>) => {
      if (message.origin !== origin || message.source !== frame.current?.contentWindow || !isRecord(message.data)) return;
      const data = message.data;
      const state = current.current;
      if (data.type === 'REBUILD_READY') {
        frame.current?.contentWindow?.postMessage({
          type: 'REBUILD_INIT',
          student: state.progress.student,
          notebookParts: [...state.summary.parts],
        }, origin);
      } else if (data.type === 'REBUILD_TELEMETRY') {
        const profile = parseStudent(data.student);
        const event = parseTelemetry(data);
        if (!profile || !event || studentKey(profile) !== studentKey(state.progress.student)) return;
        recordProgress({ student: state.progress.student, classroomId: state.classroomId, local: true, events: [event] });
      } else if (data.type === 'REBUILD_JOURNEY_COMPLETED') {
        setReview(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [start]);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#fdf6e2]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#dfc9ab] px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button type="button" className="sync-button" onClick={onExit} aria-label="Back to role selection"><ArrowLeft size={18} /> <span className="hidden sm:inline">Home</span></button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">Palampur · {student.name}</h1>
            <p className="text-xs text-[#664d3c]">Roll {student.rollNo}{classroomLabel ? ' · ' + classroomLabel : ''}</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className="sync-button hidden sm:inline-flex" onClick={() => setReview(true)}><BookOpen size={17} /> {summary.completed.size}/3 missions</button>
          <button type="button" className="sync-button sync-button-primary" onClick={() => setExporting(progress)}><QrCode size={18} /> Save / Export Progress</button>
        </div>
      </header>
      <iframe ref={frame} src={villageUrl(start)} title="REBUILD Educational Village 3D game" className="min-h-0 w-full flex-1 border-0 bg-[#d9ebfa]" allow="fullscreen" />
      {review && (
        <Modal title="Your Palampur progress" onDismiss={() => setReview(false)}>
          <ul className="mb-4 grid gap-2">
            {moduleIds.map(moduleId => (
              <li key={moduleId} className="flex items-center justify-between gap-3 rounded-xl bg-[#f5e9d8] p-3">
                <span>{MODULES[moduleId].title}</span>
                <strong className="text-sm">{summary.completed.has(moduleId) ? 'Complete' : 'In progress'}</strong>
              </li>
            ))}
          </ul>
          <button type="button" className="sync-button sync-button-primary" onClick={() => { setReview(false); setExporting(progress); }}><QrCode size={18} /> Save / Export Progress</button>
        </Modal>
      )}
      {exporting && (
        <Suspense fallback={<Modal title="Save / Export Progress" onDismiss={() => setExporting(null)}><p role="status">Preparing your code…</p></Modal>}>
          <ExportProgress progress={exporting} onDismiss={() => setExporting(null)} />
        </Suspense>
      )}
    </main>
  );
}
