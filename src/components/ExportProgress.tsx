import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { encodeProgress } from '../telemetry/qr';
import { moduleIds, notebookParts, summarize, type Progress } from '../telemetry/protocol';
import { Modal } from './common/Modal';

export function ExportProgress({ progress, onDismiss }: { progress: Progress; onDismiss: () => void }) {
  const [result] = useState(() => {
    try { return { frames: encodeProgress(progress), error: '' }; }
    catch (error) { return { frames: [], error: error instanceof Error ? error.message : 'The code could not be created.' }; }
  });
  const [page, setPage] = useState(0);
  const summary = summarize(progress.events);
  return (
    <Modal title="Save / Export Progress" onDismiss={onDismiss}>
      <p className="font-semibold">{progress.student.name} · Roll {progress.student.rollNo}</p>
      <p className="text-sm text-[#655346]">{summary.completed.size}/{moduleIds.length} missions · {summary.parts.size}/{notebookParts.length} notebook parts</p>
      {result.error ? <p role="alert" className="mt-4 text-[#9e3421]">{result.error}</p> : (
        <>
          <p className="my-4 text-sm leading-relaxed">Show this code to your teacher. Ask them to open <strong>Scan Student Work</strong> on their device.</p>
          <div className="mx-auto w-full max-w-[360px] rounded-lg bg-white p-1">
            <QRCodeSVG size={360} className="h-auto w-full" value={result.frames[page]} level="M" marginSize={4} title={`Progress QR code, page ${page + 1} of ${result.frames.length}`} />
          </div>
          {result.frames.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button className="sync-button" type="button" disabled={page === 0} onClick={() => setPage(page - 1)}><ArrowLeft size={16} /> Previous</button>
              <span role="status" className="text-sm font-bold">Page {page + 1} of {result.frames.length}</span>
              <button className="sync-button" type="button" disabled={page + 1 === result.frames.length} onClick={() => setPage(page + 1)}>Next <ArrowRight size={16} /></button>
              <p className="basis-full text-sm text-[#655346]">Show every page to your teacher to transfer all your work.</p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
