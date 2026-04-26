/**
 * models/bid.model.js
 */
const { getDB } = require('../database/db');

function getBidsByRFQ(rfqId) {
  return getDB().prepare(`
    SELECT b.*, s.name AS supplier_name
    FROM bids b
    JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.rfq_id = ?
    ORDER BY b.total_price ASC, b.submitted_at ASC
  `).all(rfqId);
}

function getBidsBySupplierAndRFQ(rfqId, supplierId) {
  return getDB().prepare(`
    SELECT * FROM bids
    WHERE rfq_id = ? AND supplier_id = ?
    ORDER BY submitted_at DESC
  `).all(rfqId, supplierId);
}

module.exports = { getBidsByRFQ, getBidsBySupplierAndRFQ };
