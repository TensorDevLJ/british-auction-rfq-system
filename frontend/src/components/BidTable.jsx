/**
 * components/BidTable.jsx
 * Display ranked bids with L1 highlighting and all quote details
 */
import React from 'react';

export default function BidTable({ rankings = [] }) {
  if (rankings.length === 0) {
    return (
      <div className="card text-center py-8 text-slate-500">
        No bids yet
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <h3 className="text-lg font-bold text-white mb-4">📊 Bid Rankings</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-semibold">Rank</th>
              <th className="text-left py-3 px-4 text-slate-400 font-semibold">Supplier</th>
              <th className="text-left py-3 px-4 text-slate-400 font-semibold">Carrier</th>
              <th className="text-right py-3 px-4 text-slate-400 font-semibold">Freight</th>
              <th className="text-right py-3 px-4 text-slate-400 font-semibold">Origin</th>
              <th className="text-right py-3 px-4 text-slate-400 font-semibold">Dest.</th>
              <th className="text-right py-3 px-4 text-slate-400 font-semibold">Total</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold">Transit</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold">Valid</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((bid) => (
              <tr
                key={bid.supplier_id}
                className={`border-b border-slate-800 transition-colors
                  ${bid.rank === 1 
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/15' 
                    : 'hover:bg-slate-800/50'}`}
              >
                <td className="py-3 px-4">
                  <span className={`font-bold ${bid.rank === 1 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {bid.rank === 1 ? '🏆 L1' : `L${bid.rank}`}
                  </span>
                </td>
                <td className="py-3 px-4 font-semibold text-white">{bid.supplier_name}</td>
                <td className="py-3 px-4 text-slate-400">{bid.carrier_name}</td>
                <td className="py-3 px-4 text-right text-slate-300">
                  ${bid.freight_charges.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right text-slate-300">
                  ${bid.origin_charges.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right text-slate-300">
                  ${bid.destination_charges.toFixed(2)}
                </td>
                <td className={`py-3 px-4 text-right font-bold
                  ${bid.rank === 1 ? 'text-emerald-400' : 'text-white'}`}>
                  ${bid.best_price.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-center text-slate-400">
                  {bid.transit_time}d
                </td>
                <td className="py-3 px-4 text-center text-slate-400">
                  {bid.quote_validity}d
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
