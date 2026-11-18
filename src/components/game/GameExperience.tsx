import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, QrCode, Loader2 } from 'lucide-react';
import { GameChapter, Lang, TelemetryEvent } from '../../types/palampur';
import { ExportProgressModal } from './ExportProgressModal';

interface GameExperienceProps {
  student: { name: string; rollNo: string };
  lang: Lang;
  chapter?: GameChapter;
  /** Unlocked notebook part ids, passed to the game in the REBUILD_INIT handshake. */
  notebookParts?: string[];
  onExit: () => void;
  onTelemetry: (event: TelemetryEvent) => void;
}

const GAME_BASE = import.meta.env.BASE_URL + 'game/';

export const GameExperience: React.FC<GameExperienceProps> = ({
  student,
  lang,
  chapter = 'water',
  notebookParts = [],
  onExit,
  onTelemetry,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const src = `${GAME_BASE}?embed=1&chapter=${chapter}&lang=${lang}`;

  const sendInit = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      { type: 'REBUILD_INIT', student, lang, notebookParts },
      window.location.origin,
    );
  }, [student, lang, notebookParts]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      // Only trust messages coming from our game frame.
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      const data = e.data as { type?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'REBUILD_READY') {
        setLoaded(true);
        sendInit();
      } else if (data.type === 'REBUILD_TELEMETRY') {
        onTelemetry(data as unknown as TelemetryEvent);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onTelemetry, sendInit]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0d0a07]">
      {/* Persistent game header */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 h-14 bg-[#33251F] text-[#FFF9F1] shadow-md">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#FFF9F1]/10 hover:bg-[#FFF9F1]/20 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Exit to dashboard</span>
          <span className="sm:hidden">Exit</span>
        </button>

        <div className="min-w-0 text-center">
          <div className="text-xs font-semibold truncate">Rebuild — Palampur</div>
          <div className="text-[11px] text-[#FFF9F1]/70 truncate">
            {student.name} · {student.rollNo || 'Explorer'} · {lang === 'kn' ? 'ಕನ್ನಡ' : 'English'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#E97832] hover:bg-[#C85A20] transition-colors cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">Save / Export Progress</span>
          <span className="sm:hidden">Save</span>
        </button>
      </header>

      {/* Game iframe */}
      <div className="relative flex-1 min-h-0">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#FFF9F1]/80 pointer-events-none">
            <Loader2 className="w-7 h-7 animate-spin" />
            <p className="text-sm font-medium">Loading the Village Planet…</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          title="Rebuild Palampur — 3D Village"
          src={src}
          onLoad={() => sendInit()}
          allow="autoplay; fullscreen; microphone"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>

      {showExport && <ExportProgressModal onClose={() => setShowExport(false)} />}
    </div>
  );
};
