/**
 * components/ActivityLog.jsx
 * Scrollable vertical timeline of all auction events
 */
import React from 'react';

const EVENT_CONFIG = {
  RFQ_CREATED:          { icon: '📋', color: 'text-slate-400',   bg: 'bg-slate-700' },
  AUCTION_STARTED:      { icon: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-900/50' },
  BID_SUBMITTED:        { icon: '💰', color: 'text-indigo-400',  bg: 'bg-indigo-900/50' },
  RANKING_CHANGED:      { icon: '📈', color: 'text-blue-400',    bg: 'bg-blue-900/50' },
  L1_CHANGED:           { icon: '🏆', color: 'text-amber-400',   bg: 'bg-amber-900/50' },
  TIME_EXTENDED:        { icon: '⏱️', color: 'text-orange-400',  bg: 'bg-orange-900/50' },
  AUCTION_CLOSED:       { icon: '✅', color: 'text-slate-400',   bg: 'bg-slate-800' },
  AUCTION_FORCE_CLOSED: { icon: '🔒', color: 'text-rose-400',    bg: 'bg-rose-900/50' },
};

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function ActivityLog({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <div className="card text-center py-8 text-slate-500">
        No activity yet
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-white mb-4">📜 Activity Log</h3>
      <div className="overflow-y-auto max-h-72 pr-1 space-y-1">
        {logs.map((log, idx) => {
          const cfg = EVENT_CONFIG[log.event_type] ?? EVENT_CONFIG.BID_SUBMITTED;
          return (
            <div
              key={log.id ?? idx}
              className={`flex gap-3 p-3 rounded-lg ${cfg.bg}`}
            >
              <div className="flex-shrink-0 text-lg">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${cfg.color} leading-snug`}>
                  {log.description}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {fmt(log.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
