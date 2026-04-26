/**
 * services/ranking.service.js - ENHANCED
 * 
 * Ranking logic:
 * - Sort by total_price ASC (lowest = best)
 * - Secondary sort by submitted_at ASC (earlier = better if tied)
 * - Assign ranks (L1 = 1, L2 = 2, etc.)
 * - L1 = lowest bidder
 * - Detect rank changes and L1 changes
 */

const { getDB } = require('../database/db');

/**
 * Get all ranked bids for an RFQ
 * Returns array with { rank, label, supplier_id, supplier_name, best_price, ... }
 */
function getRankings(rfqId) {
  const db = getDB();

  // Get best (lowest) bid per supplier
  const rows = db.prepare(`
    SELECT
      b.id,
      b.rfq_id,
      b.supplier_id,
      s.name AS supplier_name,
      b.carrier_name,
      b.freight_charges,
      b.origin_charges,
      b.destination_charges,
      b.total_price AS best_price,
      b.transit_time,
      b.quote_validity,
      b.submitted_at
    FROM bids b
    JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.rfq_id = ?
      AND b.total_price = (
        SELECT MIN(b2.total_price)
        FROM bids b2
        WHERE b2.rfq_id = b.rfq_id
          AND b2.supplier_id = b.supplier_id
      )
    GROUP BY b.supplier_id
    ORDER BY b.total_price ASC, b.submitted_at ASC
  `).all(rfqId);

  // Assign ranks
  return rows.map((row, idx) => ({
    rank: idx + 1,
    label: `L${idx + 1}`,
    ...row
  }));
}

/**
 * Get L1 (lowest bidder)
 */
function getL1(rfqId) {
  const rankings = getRankings(rfqId);
  return rankings.length > 0 ? rankings[0] : null;
}

/**
 * Detect if any rank changed between two ranking snapshots
 */
function hasAnyRankChanged(prevRankings, newRankings) {
  if (prevRankings.length !== newRankings.length) return true;
  for (let i = 0; i < prevRankings.length; i++) {
    if (prevRankings[i].supplier_id !== newRankings[i].supplier_id) return true;
  }
  return false;
}

/**
 * Detect if L1 (lowest bidder) changed
 */
function hasL1Changed(prevRankings, newRankings) {
  const prevL1 = prevRankings.length > 0 ? prevRankings[0].supplier_id : null;
  const newL1 = newRankings.length > 0 ? newRankings[0].supplier_id : null;
  return prevL1 !== newL1;
}

/**
 * Get detailed bid history for charting
 */
function getBidHistory(rfqId) {
  const db = getDB();
  return db.prepare(`
    SELECT
      b.submitted_at,
      b.total_price,
      s.name AS supplier_name,
      b.carrier_name
    FROM bids b
    JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.rfq_id = ?
    ORDER BY b.submitted_at ASC
  `).all(rfqId);
}

module.exports = {
  getRankings,
  getL1,
  hasAnyRankChanged,
  hasL1Changed,
  getBidHistory
};
