/**
 * pages/RFQDetailPage.jsx
 * Full auction detail view with real-time WebSocket updates:
 * - Countdown timer
 * - Live bid rankings table
 * - Bid submission form
 * - Activity log
 * - Price trend chart
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { rfqApi } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { showSuccess, showWarning, showError } from '../context/notificationStore';
import StatusBadge from '../components/StatusBadge';
import CountdownTimer from '../components/CountdownTimer';
import BidTable from '../components/BidTable';
import BidForm from '../components/BidForm';
import ActivityLog from '../components/ActivityLog';
import BidHistoryChart from '../components/BidHistoryChart';

const EXT_LABEL = {
  ANY_BID: 'Any Bid',
  RANK_CHANGE: 'Rank Change',
  L1_CHANGE: 'L1 Change',
};

export default function RFQDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await rfqApi.getById(id);
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Socket.IO real-time handlers
  useSocket(id, {
    'bid-update': (payload) => {
      // Merge latest data from socket event
      setData((prev) => {
        if (!prev) return prev;
        const rfq = payload.rfq ?? prev.rfq;
        const rankings = payload.rankings ?? prev.rankings;

        // Prepend new bid to history
        const newBid = payload.bid;
        const priceHistory = newBid
          ? [
              ...prev.priceHistory,
              {
                submitted_at: newBid.submitted_at,
                total_price: newBid.total_price,
                supplier_name: newBid.supplier_name,
              },
            ]
          : prev.priceHistory;

        return { ...prev, rfq, rankings, priceHistory };
      });

      if (payload.extensionApplied) {
        showWarning(
          `⏱ Auction extended to ${new Date(payload.newEndTime).toLocaleTimeString()}`,
          5000
        );
      }

      // Reload full state (logs, all bids) after a short delay
      setTimeout(load, 300);
    },

    'auction-closed': (payload) => {
      showWarning(`🔒 Auction ${payload.status === 'FORCE_CLOSED' ? 'force closed' : 'closed'}!`, 6000);
      load();
    },

    'auction-status': (payload) => {
      if (payload.status === 'ACTIVE') {
        showSuccess('🟢 Auction is now ACTIVE!', 4000);
      }
      load();
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 animate-pulse">Loading auction…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="card bg-rose-900/20 border-rose-500/30 text-rose-400">
          ⚠️ {error ?? 'Auction not found'}
          <Link to="/" className="ml-4 underline text-sm">← Back</Link>
        </div>
      </div>
    );
  }

  const { rfq, rankings, logs, priceHistory } = data;
  const l1 = rankings[0] ?? null;
  const isClosed = rfq.status === 'CLOSED' || rfq.status === 'FORCE_CLOSED';

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:text-white transition-colors">Auctions</Link>
        <span>/</span>
        <span className="text-slate-300 truncate">{rfq.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center flex-wrap gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{rfq.name}</h1>
            <StatusBadge status={rfq.status} />
          </div>
          {rfq.description && (
            <p className="text-slate-400 text-sm">{rfq.description}</p>
          )}
        </div>
        <Link to="/" className="btn-secondary text-sm">← All Auctions</Link>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* ── Countdown ── */}
        <div className="card flex flex-col items-center justify-center py-6">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-4 font-semibold">
            Time Remaining
          </p>
          <CountdownTimer endTime={rfq.end_time} status={rfq.status} />
        </div>

        {/* ── L1 Metric ── */}
        <div className="card flex flex-col justify-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-semibold">
            🏆 Best Price (L1)
          </p>
          {l1 ? (
            <>
              <p className="text-3xl font-bold text-emerald-400 mb-1">
                ${l1.best_price.toFixed(2)}
              </p>
              <p className="text-sm text-slate-400">{l1.supplier_name}</p>
              <p className="text-xs text-slate-500 mt-1">
                via {l1.carrier_name} · {l1.transit_time}d transit
              </p>
            </>
          ) : (
            <p className="text-slate-500">No bids yet</p>
          )}
        </div>

        {/* ── Config ── */}
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">
            ⚙️ Auction Config
          </p>
          <div className="space-y-2 text-sm">
            <Row label="Extension Rule" value={EXT_LABEL[rfq.extension_type]} highlight />
            <Row label="Trigger Window (X)" value={`${rfq.trigger_window} min`} />
            <Row label="Extension Time (Y)" value={`${rfq.extension_duration} min`} />
            <Row label="Forced Close" value={new Date(rfq.forced_end_time).toLocaleString()} />
            <Row label="Total Bids" value={priceHistory.length} />
          </div>
        </div>
      </div>

      {/* Bid Form */}
      {!isClosed && (
        <div className="mb-4">
          <BidForm rfqId={rfq.id} status={rfq.status} onBidSubmitted={load} />
        </div>
      )}

      {/* Rankings */}
      <div className="mb-4">
        <BidTable rankings={rankings} />
      </div>

      {/* Bottom two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ActivityLog logs={logs} />
        <BidHistoryChart priceHistory={priceHistory} />
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-indigo-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
