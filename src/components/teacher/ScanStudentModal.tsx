import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { StudentTelemetrySnapshot } from '../../types/palampur';
import { decodeSnapshot } from '../../lib/telemetrySync';

interface ScanStudentModalProps {
  onClose: () => void;
  onImport: (snapshot: StudentTelemetrySnapshot) => void;
}

export const ScanStudentModal: React.FC<ScanStudentModalProps> = ({ onClose, onImport }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error' | 'done'>('starting');
  const [message, setMessage] = useState<string>('Starting camera…');
  const [imported, setImported] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
            if (code && code.data) {
              decodeSnapshot(code.data)
                .then((snap) => {
                  if (cancelled) return;
                  setStatus('done');
                  setImported(`${snap.student.name} (${snap.student.rollNo || '—'})`);
                  onImport(snap);
                  stop();
                })
                .catch(() => {
                  /* keep scanning — not a valid REBUILD code */
                });
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('error');
        setMessage('This device has no camera API available.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setStatus('scanning');
        setMessage('Point the camera at the student’s QR code.');
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setStatus('error');
        setMessage('Camera permission was denied. Allow camera access and try again.');
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0d0a07]/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan student work"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E9D9C7] bg-[#FFF9F1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#C85A20]" />
            <h2 className="font-display text-base font-bold text-[#33251F]">Scan Student Work</h2>
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

        <div className="p-5">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {status === 'done' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#33251F]/85 text-[#FFF9F1] text-center px-4">
                <CheckCircle2 className="w-10 h-10 text-[#65966A]" />
                <p className="text-sm font-semibold">Imported {imported}</p>
              </div>
            )}
            {status !== 'done' && (
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-[#E97832]/80" />
            )}
          </div>

          <div
            className={`mt-4 flex items-start gap-2 text-xs ${
              status === 'error' ? 'text-[#C94B3F]' : 'text-[#75665C]'
            }`}
          >
            {status === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : null}
            <span>{status === 'done' ? 'Student added to the class roster.' : message}</span>
          </div>

          {status === 'done' && (
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#33251F] hover:bg-[#4A372E] text-[#FFF9F1] text-sm font-semibold cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
