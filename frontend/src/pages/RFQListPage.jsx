/**
 * pages/RFQListPage.jsx
 * Lists all auctions with live status updates via WebSocket
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { rfqApi } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import StatusBadge from '../components/StatusBadge';

function fmt(dt) {
  return new Date(dt).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const EXT_LABEL = {
  ANY_BID: 'Any Bid',
  RANK_CHANGE: 'Rank Change',
  L1_CHANGE: 'L1 Change',
};

export default function RFQListPage() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await rfqApi.getAll();
      setRfqs(res.data ?? []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Listen for global list updates
  useSocket(null, {
    'rfq-list-update': load,
    'auction-closed': load,
    'auction-status': load,
  });

  const displayed = filter
    ? rfqs.filter((r) => r.status === filter)
    : rfqs;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 animate-pulse">Loading auctions…</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Auctions</h1>
          <p className="text-slate-400 text-sm mt-1">
            {rfqs.length} RFQ{rfqs.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/create" className="btn-primary">
          ➕ Create New RFQ
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'ACTIVE', 'PENDING', 'CLOSED', 'FORCE_CLOSED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${filter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && (
        <div className="card bg-rose-900/20 border-rose-500/30 text-rose-400 mb-4">
          ⚠️ {error}
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-slate-400">No auctions found</div>
          <Link to="/create" className="btn-primary inline-block mt-4">
            Create First RFQ
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {displayed.map((rfq) => (
            <RFQCard key={rfq.id} rfq={rfq} />
          ))}
        </div>
      )}
    </div>
  );
}

function RFQCard({ rfq }) {
  return (
    <Link to={`/rfq/${rfq.id}`} className="block">
      <div className="card hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-indigo-900/10 group">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                {rfq.name}
              </h2>
              <StatusBadge status={rfq.status} />
            </div>

            {rfq.description && (
              <p className="text-sm text-slate-400 mb-3 line-clamp-1">{rfq.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              <span>🕐 Start: <span className="text-slate-300">{fmt(rfq.start_time)}</span></span>
              <span>🔔 Close: <span className="text-slate-300">{fmt(rfq.end_time)}</span></span>
              <span>🔒 Force: <span className="text-slate-300">{fmt(rfq.forced_end_time)}</span></span>
              <span>⏱ Rule: <span className="text-indigo-400 font-medium">{EXT_LABEL[rfq.extension_type]}</span></span>
              <span>X={rfq.trigger_window}min Y={rfq.extension_duration}min</span>
            </div>
          </div>

          {/* Right */}
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-slate-500 mb-1">
              {rfq.bid_count ?? 0} bid{rfq.bid_count !== 1 ? 's' : ''}
            </div>
            {rfq.lowest_bid != null ? (
              <>
                <div className="text-xs text-slate-400">Best Price</div>
                <div className="text-xl font-bold text-emerald-400">
                  ${rfq.lowest_bid.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-600">No bids</div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
