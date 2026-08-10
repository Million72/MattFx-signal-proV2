import React, { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';

export default function App() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header 
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={setSelectedTimeframe}
      />
      <Dashboard selectedTimeframe={selectedTimeframe} />
    </div>
  );
}
