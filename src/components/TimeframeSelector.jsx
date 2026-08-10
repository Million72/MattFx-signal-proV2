import React from 'react';
import { Clock } from 'lucide-react';
import { TIMEFRAMES } from '../constants/timeframes';
import clsx from 'clsx';

export default function TimeframeSelector({ selected, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-slate-400" />
      <div className="flex bg-slate-800 rounded-lg p-1">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.value}
            onClick={() => onChange(tf.value)}
            className={clsx(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              selected === tf.value
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
}
