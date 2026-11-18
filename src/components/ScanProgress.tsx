import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, RotateCcw } from 'lucide-react';
import jsQR from 'jsqr';
import { ProgressScanner } from '../telemetry/qr';
import { studentKey, type Progress } from '../telemetry/protocol';
import { Modal } from './common/Modal';

const CAMERA_ERRORS: Record<string, string> = {
  NotAllowedError: 'Camera access was denied. Allow access in your browser or choose a QR photo.',
  NotFoundError: 'This device has no available camera. Choose a QR photo instead.',
  NotReadableError: 'The camera is busy. Close other camera apps, or choose a QR photo.',
};

export function ScanProgress({ section, local, onImport, onDismiss }: {
  section: string; local: Progress[]; onImport: (progress: Progress) => { unchanged: boolean; count: number }; onDismiss: () => void;
}) {
  const [camera, setCamera] = useState<'off' | 'starting' | 'on'>('off');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const active = useRef(true);
  const attempt = useRef(0);
  const timer = useRef(0);
  const scanner = useRef(new ProgressScanner());
  const lastCode = useRef('');
  const finished = useRef(false);

  function release() {
    attempt.current++;
    window.clearTimeout(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; release(); };
  }, []);

  function accept(progress: Progress) {
    const result = onImport(progress);
    release();
    setCamera('off');
    finished.current = true;
    setError('');
    setMessage(result.unchanged
      ? `${progress.student.name}’s progress is already in ${section}.`
      : `${progress.student.name} · Roll ${progress.student.rollNo} added to ${section} (${result.count} new events).`);
  }

  function read(code: string) {
    if (code === lastCode.current || finished.current) return;
    lastCode.current = code;
    try {
      const result = scanner.current.add(code);
      setError('');
      if (result.progress) accept(result.progress);
      else setMessage(`Scanned ${result.scanned} of ${result.total} pages. Show the next QR page.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The QR code could not be read.');
    }
  }

  function decode(source: CanvasImageSource, width: number, height: number, canvas: HTMLCanvasElement) {
    const scale = Math.min(1, 1280 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
  }

  function reset() {
    scanner.current = new ProgressScanner();
    lastCode.current = '';
    finished.current = false;
    setError('');
    setMessage('');
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setError('Camera access requires HTTPS or localhost. You can still choose a QR photo.');
      return;
    }
    if (finished.current) reset();
    setCamera('starting');
    setError('');
    const generation = ++attempt.current;
    try {
      const opened = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      if (!active.current || generation !== attempt.current || !video.current) {
        opened.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = opened;
      video.current.srcObject = opened;
      await video.current.play();
      if (!active.current || generation !== attempt.current) return;
      setCamera('on');
      const canvas = document.createElement('canvas');
      function tick() {
        if (!active.current || generation !== attempt.current) return;
        const element = video.current;
        if (element && element.readyState >= 2 && element.videoWidth) {
          const code = decode(element, element.videoWidth, element.videoHeight, canvas);
          if (code) read(code);
        }
        if (generation === attempt.current) timer.current = window.setTimeout(tick, 230);
      }
      tick();
    } catch (error) {
      if (!active.current || generation !== attempt.current) return;
      release();
      setCamera('off');
      setError(error instanceof Error && CAMERA_ERRORS[error.name] || 'The camera could not start. You can choose a QR photo.');
    }
  }

  async function readPhoto(file: File) {
    if (finished.current) reset();
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!active.current) return;
      const code = decode(image, image.naturalWidth, image.naturalHeight, document.createElement('canvas'));
      if (code) read(code);
      else setError('No QR code found. Try a closer, sharper photo with the entire code visible.');
    } catch {
      if (active.current) setError('That image could not be opened.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <Modal title="Scan Student Work" onDismiss={onDismiss}>
      <p className="mb-4 text-sm leading-relaxed">Importing into <strong>{section}</strong>. Point your camera at the QR code on the student’s screen.</p>
      <video ref={video} playsInline muted hidden={camera === 'off'} aria-label="QR scanner camera preview" className="mb-3 aspect-video max-h-[40dvh] w-full rounded-xl bg-[#33251f] object-contain" />
      <div className="flex flex-wrap gap-2">
        {camera === 'off' ? (
          <button className="sync-button sync-button-primary" type="button" onClick={start}><Camera size={17} /> {finished.current ? 'Scan another student' : 'Start camera'}</button>
        ) : (
          <button className="sync-button" type="button" onClick={() => { release(); setCamera('off'); }}>{camera === 'starting' ? 'Cancel camera request' : 'Stop camera'}</button>
        )}
        <label className="sync-button relative focus-within:outline-2"><ImageUp size={17} /> Choose QR photo
          <input type="file" accept="image/*" aria-label="Choose QR photo" className="absolute inset-0 w-full cursor-pointer opacity-0" onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void readPhoto(file);
          }} />
        </label>
        <button className="sync-button" type="button" onClick={reset}><RotateCcw size={15} /> Reset scan</button>
      </div>
      {error && <p className="mt-4 rounded-lg bg-[#f8e2d7] p-3 text-sm text-[#8c2e1d]" role="alert">{error}</p>}
      {message && <p className="mt-4 rounded-lg bg-[#e5eadb] p-3 text-sm text-[#34482d]" role="status">{message}</p>}
      {local.length > 0 && (
        <details className="mt-5 border-t border-[#e9d9c7] pt-4">
          <summary className="cursor-pointer text-sm font-bold">Add work from this device</summary>
          <ul className="mt-3 grid gap-2">
            {local.map(progress => (
              <li key={studentKey(progress.student)} className="flex items-center justify-between gap-2 text-sm">
                <span>{progress.student.name} · Roll {progress.student.rollNo}</span>
                <button type="button" className="sync-button" onClick={() => accept(progress)}>Add</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Modal>
  );
}
