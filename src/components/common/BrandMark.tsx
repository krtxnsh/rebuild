import React, { useEffect, useState } from 'react';

export const PalampurLogo: React.FC<{
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ dark = false, size = 'md' }) => {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 40 : 34;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        width="40"
        height="40"
        rx="10"
        fill={dark ? '#FFF9F1' : '#E97832'}
      />
      {/* Himalayan peaks */}
      <path
        d="M6 25L14.5 11.5L20 19.5L26 10L34 25H6Z"
        fill={dark ? '#E97832' : '#FFF9F1'}
        fillOpacity={dark ? '0.95' : '0.95'}
      />
      <path
        d="M14.5 11.5L17.4 16L14.5 14.8L11.6 16L14.5 11.5Z"
        fill={dark ? '#FFF9F1' : '#F5A34A'}
      />
      <path
        d="M26 10L29.2 15.6L26 14.1L22.8 15.6L26 10Z"
        fill={dark ? '#FFF9F1' : '#F5A34A'}
      />
      {/* Open book base */}
      <path
        d="M7 27.5C11.5 25.8 16.2 26.2 20 28.8C23.8 26.2 28.5 25.8 33 27.5V31.5C28.5 29.8 23.8 30.2 20 32.5C16.2 30.2 11.5 29.8 7 31.5V27.5Z"
        fill={dark ? '#33251F' : '#C85A20'}
      />
    </svg>
  );
};

const AVATAR_PALETTES = [
  { bg: '#FDE8D7', shirt: '#E97832', hair: '#33251F', skin: '#F1C29B' },
  { bg: '#E3EFE4', shirt: '#65966A', hair: '#2A1E19', skin: '#E6B18A' },
  { bg: '#FCEFD6', shirt: '#C85A20', hair: '#3D2B24', skin: '#F4C9A4' },
  { bg: '#F4E5D8', shirt: '#75665C', hair: '#1F1612', skin: '#D9A179' },
  { bg: '#FCE7DE', shirt: '#C94B3F', hair: '#33251F', skin: '#ECC09B' },
  { bg: '#FBEBD1', shirt: '#E8AA43', hair: '#2D201B', skin: '#E2AF86' },
];

export const PersonAvatar: React.FC<{
  name: string;
  variant?: number;
  role?: 'student' | 'teacher';
  size?: number;
}> = ({ name, variant = 0, role = 'student', size = 40 }) => {
  const palette = AVATAR_PALETTES[Math.abs(variant) % AVATAR_PALETTES.length];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${name} avatar`}
      className="shrink-0 rounded-full border border-[#E9D9C7]"
    >
      <circle cx="24" cy="24" r="24" fill={palette.bg} />
      {/* Shoulders */}
      <path
        d="M9 44C10.5 35.5 16.5 32 24 32C31.5 32 37.5 35.5 39 44"
        fill={palette.shirt}
      />
      {/* Collar */}
      <path d="M19 32.5L24 36.5L29 32.5" fill="#FFF9F1" />
      {/* Head */}
      <circle cx="24" cy="21" r="8.5" fill={palette.skin} />
      {/* Hair */}
      {role === 'teacher' ? (
        <>
          <path
            d="M14.5 21C14.5 14.5 18.8 10.5 24 10.5C29.2 10.5 33.5 14.5 33.5 21C33.5 24 32.8 27 31.5 28.5C31.8 24 31 16.5 24 16.5C17 16.5 16.2 24 16.5 28.5C15.2 27 14.5 24 14.5 21Z"
            fill={palette.hair}
          />
          {/* Glasses */}
          <rect
            x="17.5"
            y="19.5"
            width="5.2"
            height="4"
            rx="1.2"
            stroke="#33251F"
            strokeWidth="1.2"
            fill="none"
          />
          <rect
            x="25.3"
            y="19.5"
            width="5.2"
            height="4"
            rx="1.2"
            stroke="#33251F"
            strokeWidth="1.2"
            fill="none"
          />
          <line x1="22.7" y1="21.3" x2="25.3" y2="21.3" stroke="#33251F" strokeWidth="1.2" />
        </>
      ) : (
        <path
          d="M15.3 20C15.3 14.2 19.2 11 24 11C28.8 11 32.7 14.2 32.7 20C30.8 17.2 27.6 15.8 24 15.8C20.4 15.8 17.2 17.2 15.3 20Z"
          fill={palette.hair}
        />
      )}
      {/* Eyes & smile */}
      <circle cx="20.5" cy="21.5" r="1.1" fill="#33251F" />
      <circle cx="27.5" cy="21.5" r="1.1" fill="#33251F" />
      <path
        d="M21 25.2C22 26.4 26 26.4 27 25.2"
        stroke="#33251F"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const AnimatedNumber: React.FC<{
  value: number;
  suffix?: string;
  className?: string;
}> = ({ value, suffix = '', className = '' }) => {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 420;
    const t0 = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={`tabular-nums ${className}`}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
};
