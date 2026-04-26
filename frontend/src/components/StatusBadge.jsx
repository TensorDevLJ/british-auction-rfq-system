/**
 * components/StatusBadge.jsx
 * Visual status indicator for auctions
 */
import React from 'react';

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400 animate-pulse' },
  PENDING: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  CLOSED: { label: 'Closed', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
  FORCE_CLOSED: { label: 'Force Closed', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/30', dot: 'bg-rose-400' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
