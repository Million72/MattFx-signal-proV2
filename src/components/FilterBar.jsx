import React from 'react';
import { Filter, X } from 'lucide-react';
import clsx from 'clsx';

export default function FilterBar({ filters, onFilterChange }) {
  const confidenceLevels = [
    { value: 90, label: 'A+ (90%+)' },
    { value: 80, label: 'A (80%+)' },
    { value: 70, label: 'B (70%+)' },
    { value: 60, label: 'C (60%+)' },
  ];

  const signalTypes = ['BUY', 'SELL'];

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <h3 className="font-semibold text-sm">Filters</h3>
      </div>

      <div className="space-y-4">
        {/* Confidence Filter */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Minimum Confidence</label>
          <div className="flex gap-1">
            {confidenceLevels.map(level => (
              <button
                key={level.value}
                onClick={() => onFilterChange({ ...filters, minConfidence: level.value })}
                className={clsx(
                  "flex-1 px-2 py-1 rounded text-xs transition-all",
                  filters.minConfidence === level.value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                )}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        {/* Signal Type Filter */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Signal Type</label>
          <div className="flex gap-2">
            {signalTypes.map(type => (
              <button
                key={type}
                onClick={() => {
                  const types = filters.signalTypes.includes(type)
                    ? filters.signalTypes.filter(t => t !== type)
                    : [...filters.signalTypes, type];
                  onFilterChange({ ...filters, signalTypes: types });
                }}
                className={clsx(
                  "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                  filters.signalTypes.includes(type)
                    ? type === 'BUY'
                      ? "bg-emerald-600 text-white"
                      : "bg-red-600 text-white"
                    : "bg-slate-800 text-slate-400"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters */}
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-slate-500">Active:</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
            {filters.minConfidence}%+
          </span>
          {filters.signalTypes.map(type => (
            <span
              key={type}
              className={clsx(
                "text-xs px-2 py-0.5 rounded",
                type === 'BUY'
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              )}
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
