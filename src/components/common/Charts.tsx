import React, { useState } from 'react';

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

export const PerformanceLineChart: React.FC<{
  labels: string[];
  series: LineSeries[];
  height?: number;
  highlightIndex?: number;
}> = ({ labels, series, height = 210, highlightIndex }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 560;
  const padL = 38;
  const padR = 18;
  const padT = 18;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const xFor = (i: number) =>
    labels.length <= 1 ? padL + innerW / 2 : padL + (i / (labels.length - 1)) * innerW;
  const yFor = (val: number) => padT + innerH - (Math.max(0, Math.min(100, val)) / 100) * innerH;

  const activeIdx = hoverIdx ?? highlightIndex ?? null;

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Performance trend chart"
      >
        <defs>
          {series.map((s, idx) => (
            <linearGradient
              key={s.name}
              id={`line-grad-${idx}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Horizontal grid lines */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#E9D9C7"
                strokeDasharray={tick === 0 ? undefined : '3 4'}
                strokeWidth="1"
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[#75665C] text-[10px] font-mono tabular-nums"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Area + smooth polyline for each series */}
        {series.map((s, sIdx) => {
          const pts = s.values.map((v, i) => ({ x: xFor(i), y: yFor(v), v }));
          const pathD = pts
            .map((p, i) => {
              if (i === 0) return `M ${p.x} ${p.y}`;
              const prev = pts[i - 1];
              const cx = (prev.x + p.x) / 2;
              return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
            })
            .join(' ');
          const areaD =
            series.length === 1 && pts.length > 0
              ? `${pathD} L ${pts[pts.length - 1].x} ${yFor(0)} L ${pts[0].x} ${yFor(0)} Z`
              : '';

          return (
            <g key={s.name}>
              {areaD && <path d={areaD} fill={`url(#line-grad-${sIdx})`} />}
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth={series.length === 1 ? 2.6 : 2.2}
                strokeLinecap="round"
              />
              {pts.map((p, i) => {
                const isActive = activeIdx === i;
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 5 : 3.2}
                    fill={isActive ? '#FFFDFA' : s.color}
                    stroke={s.color}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                );
              })}
            </g>
          );
        })}

        {/* X axis labels */}
        {labels.map((lbl, i) => (
          <text
            key={lbl + i}
            x={xFor(i)}
            y={height - 6}
            textAnchor="middle"
            className={`text-[10.5px] font-medium ${
              activeIdx === i ? 'fill-[#33251F] font-semibold' : 'fill-[#75665C]'
            }`}
          >
            {lbl}
          </text>
        ))}

        {/* Active vertical guide */}
        {activeIdx !== null && (
          <line
            x1={xFor(activeIdx)}
            y1={padT}
            x2={xFor(activeIdx)}
            y2={padT + innerH}
            stroke="#E97832"
            strokeOpacity="0.35"
            strokeDasharray="3 3"
          />
        )}

        {/* Invisible hover hit targets */}
        {labels.map((lbl, i) => {
          const x = xFor(i);
          const colW = innerW / Math.max(1, labels.length);
          return (
            <rect
              key={`hit-${lbl}-${i}`}
              x={x - colW / 2}
              y={padT}
              width={colW}
              height={innerH + padB}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}
      </svg>

      {/* Interactive tooltip */}
      {activeIdx !== null && (
        <div
          className="pointer-events-none absolute top-1 right-2 rounded-lg border border-[#E9D9C7] bg-[#FFFDFA] px-3 py-1.5 shadow-sm text-xs"
        >
          <div className="font-semibold text-[#33251F] mb-0.5">{labels[activeIdx]}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {series.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5 text-[#75665C] tabular-nums">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.name}:</span>
                <strong className="text-[#33251F]">{s.values[activeIdx]}%</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SubjectBarChart: React.FC<{
  items: Array<{ label: string; value: number; color?: string }>;
  height?: number;
}> = ({ items, height = 178 }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div
      className="flex items-end justify-between gap-4 pt-6 pb-1 px-2"
      style={{ height }}
    >
      {items.map((item) => {
        const isHovered = hovered === item.label;
        const barColor = item.color ?? '#E97832';
        return (
          <div
            key={item.label}
            className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className={`text-xs font-mono font-semibold tabular-nums mb-1.5 transition-colors ${
                isHovered ? 'text-[#C85A20]' : 'text-[#33251F]'
              }`}
            >
              {item.value}%
            </span>
            <div className="w-full max-w-[44px] flex-1 bg-[#FFF6E9] rounded-t-lg border border-[#E9D9C7]/80 flex items-end overflow-hidden">
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${Math.max(8, Math.min(100, item.value))}%`,
                  background: `linear-gradient(180deg, ${barColor} 0%, #C85A20 100%)`,
                  opacity: hovered && !isHovered ? 0.65 : 1,
                }}
              />
            </div>
            <span className="mt-2 text-xs font-medium text-[#75665C] whitespace-nowrap">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const CircularProgressRing: React.FC<{
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}> = ({
  value,
  size = 116,
  strokeWidth = 10,
  label,
  sublabel,
  color = '#E97832',
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#F3E5D4"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-xl font-bold text-[#33251F] tabular-nums leading-none">
          {label ?? `${clamped}%`}
        </span>
        {sublabel && (
          <span className="text-[11px] font-medium text-[#75665C] mt-1">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

export const SparklineTrend: React.FC<{
  values: number[];
  color?: string;
}> = ({ values, color = '#65966A' }) => {
  const w = 130;
  const h = 38;
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const span = Math.max(1, max - min);

  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (w - 8) + 4;
      const y = h - 4 - ((v - min) / span) * (h - 8);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
};
