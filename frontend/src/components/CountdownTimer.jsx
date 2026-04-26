/**
 * components/CountdownTimer.jsx
 * Real-time countdown to auction close
 */
import React, { useState, useEffect } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

function getRemaining(endTime) {
  const diff = Math.max(0, new Date(endTime) - Date.now());
  const totalSecs = Math.floor(diff / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return { hours, mins, secs, totalSecs };
}

export default function CountdownTimer({ endTime, status }) {
  const [remaining, setRemaining] = useState(getRemaining(endTime));
  const [extended, setExtended] = useState(false);
  const prevEndRef = React.useRef(endTime);

  useEffect(() => {
    if (prevEndRef.current !== endTime) {
      setExtended(true);
      setTimeout(() => setExtended(false), 3000);
    }
    prevEndRef.current = endTime;
  }, [endTime]);

  useEffect(() => {
    if (status === 'CLOSED' || status === 'FORCE_CLOSED') return;
    const timer = setInterval(() => setRemaining(getRemaining(endTime)), 1000);
    return () => clearInterval(timer);
  }, [endTime, status]);

  const isClosed = status === 'CLOSED' || status === 'FORCE_CLOSED';
  const isUrgent = !isClosed && remaining.totalSecs <= 300;
  const isEmpty = remaining.totalSecs === 0;

  return (
    <div className="text-center">
      {extended && (
        <div className="mb-2 text-xs font-bold text-amber-400 animate-bounce tracking-widest uppercase">
          ⏱ Auction Extended!
        </div>
      )}

      {isClosed ? (
        <div className="text-2xl font-bold text-slate-500">
          {status === 'FORCE_CLOSED' ? '🔒 Force Closed' : '✅ Closed'}
        </div>
      ) : isEmpty ? (
        <div className="text-2xl font-bold text-rose-400">Time's Up!</div>
      ) : (
        <div className={`flex items-center justify-center gap-1 font-mono font-bold
          ${isUrgent ? 'text-rose-400' : 'text-white'}`}>
          {remaining.hours > 0 && (
            <>
              <TimeBlock value={remaining.hours} label="HRS" urgent={isUrgent} />
              <span className="text-3xl mb-4 text-slate-500">:</span>
            </>
          )}
          <TimeBlock value={remaining.mins} label="MIN" urgent={isUrgent} />
          <span className="text-3xl mb-4 text-slate-500">:</span>
          <TimeBlock value={remaining.secs} label="SEC" urgent={isUrgent} />
        </div>
      )}

      <p className="text-xs text-slate-500 mt-2">
        Closes: {new Date(endTime).toLocaleString()}
      </p>
    </div>
  );
}

function TimeBlock({ value, label, urgent }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`text-4xl w-16 h-16 flex items-center justify-center rounded-xl
        ${urgent ? 'bg-rose-500/20 border border-rose-500/40' : 'bg-slate-800 border border-slate-700'}`}>
        {pad(value)}
      </div>
      <span className="text-[10px] text-slate-500 mt-1 tracking-widest">{label}</span>
    </div>
  );
}
