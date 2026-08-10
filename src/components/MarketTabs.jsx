import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

export default function MarketTabs({ selected, onChange }) {
  const tabs = [
    { id: 'forex', label: 'Forex', icon: TrendingUp, count: 10 },
    { id: 'synthetic', label: 'Synthetic', icon: BarChart3, count: 17 },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map(tab => (
        <motion.button
          key={tab.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(tab.id)}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all",
            selected === tab.id
              ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg"
              : "bg-slate-800 text-slate-400 hover:text-white"
          )}
        >
          <tab.icon className="w-4 h-4" />
          <span>{tab.label}</span>
          <span className={clsx(
            "text-xs px-1.5 py-0.5 rounded-full",
            selected === tab.id ? "bg-white/20" : "bg-slate-700"
          )}>
            {tab.count}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
