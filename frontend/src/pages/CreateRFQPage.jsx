/**
 * pages/CreateRFQPage.jsx
 * Form to create a new RFQ with all fields and validation
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rfqApi } from '../services/api';
import { showSuccess, showError } from '../context/notificationStore';

const EXT_RULES = [
  {
    value: 'L1_CHANGE',
    label: 'L1 Change',
    icon: '🏆',
    desc: 'Extend only when the lowest bidder (L1) changes. Most selective.',
  },
  {
    value: 'RANK_CHANGE',
    label: 'Rank Change',
    icon: '📈',
    desc: 'Extend if any supplier\'s ranking changes. Moderate sensitivity.',
  },
  {
    value: 'ANY_BID',
    label: 'Any Bid',
    icon: '⚡',
    desc: 'Extend whenever any bid arrives in the trigger window. Most aggressive.',
  },
];

function localNow(offsetMins = 0) {
  const d = new Date(Date.now() + offsetMins * 60000);
  // Format for datetime-local input
  return d.toISOString().slice(0, 16);
}

export default function CreateRFQPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    start_time: localNow(5),
    end_time: localNow(125),
    forced_end_time: localNow(185),
    trigger_window: '10',
    extension_duration: '5',
    extension_type: 'L1_CHANGE',
  });

  function set(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function validate() {
    if (!form.name.trim()) return 'Auction name is required';
    const s = new Date(form.start_time);
    const e = new Date(form.end_time);
    const f = new Date(form.forced_end_time);
    if (e <= s) return 'Close time must be after start time';
    if (f <= e) return 'Forced close must be after close time';
    if (parseInt(form.trigger_window) <= 0) return 'Trigger window must be positive';
    if (parseInt(form.extension_duration) <= 0) return 'Extension duration must be positive';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { showError(err); return; }

    setLoading(true);
    try {
      const res = await rfqApi.create({
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        forced_end_time: new Date(form.forced_end_time).toISOString(),
        trigger_window: parseInt(form.trigger_window),
        extension_duration: parseInt(form.extension_duration),
      });
      showSuccess('🎉 Auction created successfully!');
      navigate(`/rfq/${res.data.id}`);
    } catch (err) {
      showError(err.message ?? 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  }

  // Timeline preview
  const startD = new Date(form.start_time);
  const endD = new Date(form.end_time);
  const forceD = new Date(form.forced_end_time);
  const durationMins = Math.round((endD - startD) / 60000);
  const bufferMins = Math.round((forceD - endD) / 60000);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create New RFQ</h1>
        <p className="text-slate-400 mt-1 text-sm">Configure your British auction</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <h2 className="text-base font-bold text-white mb-4">📋 Auction Details</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Auction Name *</label>
              <input
                className="input"
                placeholder="e.g. Freight Mumbai → Rotterdam Q2 2024"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Add context for suppliers (optional)"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card">
          <h2 className="text-base font-bold text-white mb-4">🕐 Timeline</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Start Time *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.start_time}
                onChange={(e) => set('start_time', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Close Time *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.end_time}
                onChange={(e) => set('end_time', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Forced Close *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.forced_end_time}
                onChange={(e) => set('forced_end_time', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Timeline preview */}
          {durationMins > 0 && (
            <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400 space-y-1">
              <p>⏱ Auction duration: <span className="text-white font-semibold">{durationMins} minutes</span></p>
              <p>🔒 Force-close buffer: <span className="text-white font-semibold">{bufferMins} minutes</span></p>
              <p className="text-slate-500">
                Start → {startD.toLocaleTimeString()} &nbsp;|&nbsp;
                Close → {endD.toLocaleTimeString()} &nbsp;|&nbsp;
                Forced → {forceD.toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Extension Rule */}
        <div className="card">
          <h2 className="text-base font-bold text-white mb-1">⚡ Extension Rule</h2>
          <p className="text-xs text-slate-400 mb-4">
            If triggered in last <strong className="text-slate-300">X</strong> minutes →
            extend by <strong className="text-slate-300">Y</strong> minutes (capped at forced close)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="label">Trigger Window (X minutes)</label>
              <input
                type="number"
                min="1"
                className="input"
                value={form.trigger_window}
                onChange={(e) => set('trigger_window', e.target.value)}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Last {form.trigger_window} min before close
              </p>
            </div>
            <div>
              <label className="label">Extension Duration (Y minutes)</label>
              <input
                type="number"
                min="1"
                className="input"
                value={form.extension_duration}
                onChange={(e) => set('extension_duration', e.target.value)}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Adds {form.extension_duration} min to close time
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EXT_RULES.map((rule) => (
              <button
                type="button"
                key={rule.value}
                onClick={() => set('extension_type', rule.value)}
                className={`p-4 rounded-xl border text-left transition-all
                  ${form.extension_type === rule.value
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
              >
                <div className="text-2xl mb-2">{rule.icon}</div>
                <div className="text-sm font-bold text-white mb-1">{rule.label}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{rule.desc}</div>
              </button>
            ))}
          </div>

          {/* Formula */}
          <div className="mt-4 bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400 font-mono">
            newCloseTime = min(currentClose + {form.extension_duration}min, forcedClose)
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
        >
          {loading ? 'Creating…' : '🚀 Create Auction'}
        </button>
      </form>
    </div>
  );
}
