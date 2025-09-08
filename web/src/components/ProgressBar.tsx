import React from 'react';

type Props = {
  value: number;           // 0..100
  label?: string;          // texte optionnel sous la barre
};

export default function ProgressBar({ value, label }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="w-full">
      <div className="w-full h-3 bg-neutral-800/80 rounded-full overflow-hidden">
        <div
          className="h-3 bg-emerald-500 transition-all duration-300"
          style={{ width: `${clamped}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clamped}
          role="progressbar"
        />
      </div>
      {label ? <div className="text-xs text-neutral-300 mt-1">{label}</div> : null}
    </div>
  );
}
