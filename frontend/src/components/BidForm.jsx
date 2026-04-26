/**
 * components/BidForm.jsx
 * Full quote submission form with all charge fields
 */
import React, { useState } from 'react';
import { bidApi } from '../services/api';
import { showSuccess, showError } from '../context/notificationStore';

const DEFAULT_FORM = {
  supplier_name: '',
  carrier_name: '',
  freight_charges: '',
  origin_charges: '',
  destination_charges: '',
  transit_time: '',
  quote_validity: '30',
};

export default function BidForm({ rfqId, status, onBidSubmitted }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isOpen = status === 'ACTIVE';

  const totalPrice =
    (parseFloat(form.freight_charges) || 0) +
    (parseFloat(form.origin_charges) || 0) +
    (parseFloat(form.destination_charges) || 0);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isOpen || loading) return;

    if (!form.supplier_name.trim() || !form.carrier_name.trim()) {
      showError('Supplier name and carrier name are required');
      return;
    }
    if (totalPrice <= 0) {
      showError('Total price must be greater than 0');
      return;
    }
    if (!form.transit_time || parseInt(form.transit_time) <= 0) {
      showError('Transit time must be a positive number');
      return;
    }

    setLoading(true);
    try {
      const res = await bidApi.submit(rfqId, {
        supplier_name: form.supplier_name.trim(),
        carrier_name: form.carrier_name.trim(),
        freight_charges: parseFloat(form.freight_charges) || 0,
        origin_charges: parseFloat(form.origin_charges) || 0,
        destination_charges: parseFloat(form.destination_charges) || 0,
        transit_time: parseInt(form.transit_time),
        quote_validity: parseInt(form.quote_validity) || 30,
      });

      showSuccess(
        res.data.extensionApplied
          ? `✅ Bid submitted! Auction extended to ${new Date(res.data.newEndTime).toLocaleTimeString()}`
          : `✅ Bid of $${totalPrice.toFixed(2)} submitted!`
      );

      onBidSubmitted?.();
      setForm(DEFAULT_FORM);

      // 5 second cooldown
      let secs = 5;
      setCooldown(secs);
      const tick = setInterval(() => {
        secs--;
        setCooldown(secs);
        if (secs <= 0) clearInterval(tick);
      }, 1000);
    } catch (err) {
      showError(err.message ?? 'Failed to submit bid');
      if (err.message?.includes('Rate limit')) {
        const match = err.message.match(/wait (\d+)s/);
        const secs = parseInt(match?.[1] ?? '5');
        let remaining = secs;
        setCooldown(remaining);
        const tick = setInterval(() => {
          remaining--;
          setCooldown(remaining);
          if (remaining <= 0) clearInterval(tick);
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="card text-center py-6 text-slate-500">
        {status === 'PENDING' ? '⏳ Auction hasn\'t started yet' : '🔒 Auction is closed — no more bids'}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3 className="text-lg font-bold text-white mb-5">💼 Submit Quote</h3>

      {/* Row 1: Supplier & Carrier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Supplier Name *</label>
          <input
            className="input"
            placeholder="e.g. Global Freight Co."
            value={form.supplier_name}
            onChange={(e) => set('supplier_name', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Carrier Name *</label>
          <input
            className="input"
            placeholder="e.g. Maersk Line"
            value={form.carrier_name}
            onChange={(e) => set('carrier_name', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Row 2: Charges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="label">Freight Charges ($) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            placeholder="0.00"
            value={form.freight_charges}
            onChange={(e) => set('freight_charges', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Origin Charges ($) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            placeholder="0.00"
            value={form.origin_charges}
            onChange={(e) => set('origin_charges', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Destination Charges ($) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            placeholder="0.00"
            value={form.destination_charges}
            onChange={(e) => set('destination_charges', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Total preview */}
      <div className="bg-slate-800/60 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">Total Price (auto-calculated)</span>
        <span className={`text-xl font-bold ${totalPrice > 0 ? 'text-indigo-300' : 'text-slate-600'}`}>
          ${totalPrice.toFixed(2)}
        </span>
      </div>

      {/* Row 3: Transit & Validity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="label">Transit Time (days) *</label>
          <input
            type="number"
            min="1"
            className="input"
            placeholder="e.g. 14"
            value={form.transit_time}
            onChange={(e) => set('transit_time', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Quote Validity (days) *</label>
          <input
            type="number"
            min="1"
            className="input"
            placeholder="e.g. 30"
            value={form.quote_validity}
            onChange={(e) => set('quote_validity', e.target.value)}
            required
          />
        </div>
      </div>

      {cooldown > 0 ? (
        <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 text-slate-400 text-sm font-semibold">
          <span className="animate-spin">⏳</span> Next bid in {cooldown}s...
        </div>
      ) : (
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Submitting...' : `Submit Quote — $${totalPrice.toFixed(2)}`}
        </button>
      )}
    </form>
  );
}
