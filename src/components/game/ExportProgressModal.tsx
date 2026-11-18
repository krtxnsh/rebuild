import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, QrCode, Loader2 } from 'lucide-react';
import { StudentTelemetrySnapshot } from '../../types/palampur';
import { buildSnapshotFromStorage, encodeSnapshot } from '../../lib/telemetrySync';

interface ExportProgressModalProps {
  onClose: () => void;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({ onClose }) => {
  const [value, setValue] = useState<string | null>(null);
  const [snap, setSnap] = useState<StudentTelemetrySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const snapshot = buildSnapshotFromStorage();
    setSnap(snapshot);
    encodeSnapshot(snapshot)
      .then((encoded) => {
        if (!cancelled) setValue(encoded);
      })
      .catch(() => {
        if (!cancelled) setError('Could not build the progress code.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const misconceptionCount =
    snap?.events.filter((e) => e.event === 'MISCONCEPTION_RECORDED').length ?? 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0d0a07]/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Save or export your progress"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E9D9C7] bg-[#FFF9F1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#C85A20]" />
            <h2 className="font-display text-base font-bold text-[#33251F]">Save / Export Progress</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#75665C] hover:text-[#33251F] hover:bg-[#FFF6E9] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center text-center">
          <p className="text-sm text-[#75665C] mb-4">
            Show this code to your teacher. They scan it to add your work to the class — no
            internet or cables needed.
          </p>

          <div className="rounded-xl border border-[#E9D9C7] bg-white p-3 shadow-sm">
            {value ? (
              <QRCodeCanvas value={value} size={208} level="M" marginSize={2} />
            ) : (
              <div className="w-[208px] h-[208px] flex items-center justify-center text-[#75665C]">
                {error ? (
                  <span className="text-xs">{error}</span>
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin" />
                )}
              </div>
            )}
          </div>

          {snap && (
            <div className="mt-4 w-full grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#FFF9F1] border border-[#E9D9C7] py-2">
                <div className="font-mono font-bold text-[#33251F] tabular-nums">
                  {snap.notebookParts.length}
                </div>
                <div className="text-[10px] text-[#75665C]">Notebook parts</div>
              </div>
              <div className="rounded-lg bg-[#FFF9F1] border border-[#E9D9C7] py-2">
                <div className="font-mono font-bold text-[#33251F] tabular-nums">
                  {snap.events.length}
                </div>
                <div className="text-[10px] text-[#75665C]">Events</div>
              </div>
              <div className="rounded-lg bg-[#FFF9F1] border border-[#E9D9C7] py-2">
                <div className="font-mono font-bold text-[#33251F] tabular-nums">
                  {misconceptionCount}
                </div>
                <div className="text-[10px] text-[#75665C]">Misconceptions</div>
              </div>
            </div>
          )}

          {snap && (
            <p className="mt-3 text-xs text-[#75665C]">
              {snap.student.name} · {snap.student.rollNo || 'Explorer'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
