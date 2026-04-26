/**
 * models/rfq.model.js - ENHANCED
 * RFQ CRUD operations with validation
 */
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const rankingService = require('../services/ranking.service');

function createRFQ(data) {
  const db = getDB();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Validate times
  if (new Date(data.forced_end_time) <= new Date(data.end_time)) {
    throw Object.assign(
      new Error('Forced close time must be after close time'),
      { status: 400 }
    );
  }
  if (new Date(data.end_time) <= new Date(data.start_time)) {
    throw Object.assign(
      new Error('Close time must be after start time'),
      { status: 400 }
    );
  }

  // Validate extension rule
  if (!['ANY_BID', 'RANK_CHANGE', 'L1_CHANGE'].includes(data.extension_type)) {
    throw Object.assign(
      new Error('Invalid extension rule'),
      { status: 400 }
    );
  }

  // Validate durations
  if (data.trigger_window <= 0 || data.extension_duration <= 0) {
    throw Object.assign(
      new Error('Durations must be positive'),
      { status: 400 }
    );
  }

  const startTime = new Date(data.start_time);
  const status = new Date() >= startTime ? 'ACTIVE' : 'PENDING';

  db.prepare(`
    INSERT INTO rfqs
      (id, name, description, start_time, end_time, forced_end_time,
       trigger_window, extension_duration, extension_type, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.description ?? null,
    new Date(data.start_time).toISOString(),
    new Date(data.end_time).toISOString(),
    new Date(data.forced_end_time).toISOString(),
    data.trigger_window,
    data.extension_duration,
    data.extension_type,
    status,
    now,
    now
  );

  return db.prepare('SELECT * FROM rfqs WHERE id = ?').get(id);
}

function getAllRFQs(filters = {}) {
  const db = getDB();
  let query = `
    SELECT r.*,
           MIN(b.total_price) AS lowest_bid,
           COUNT(b.id) AS bid_count
    FROM rfqs r
    LEFT JOIN bids b ON b.rfq_id = r.id
  `;

  const params = [];
  if (filters.status) {
    query += ' WHERE r.status = ?';
    params.push(filters.status);
  }

  query += ' GROUP BY r.id ORDER BY r.created_at DESC';

  return db.prepare(query).all(...params);
}

function getRFQById(id) {
  const db = getDB();
  const rfq = db.prepare('SELECT * FROM rfqs WHERE id = ?').get(id);

  if (!rfq) return null;

  const bids = db.prepare(`
    SELECT b.*, s.name AS supplier_name
    FROM bids b
    JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.rfq_id = ?
    ORDER BY b.total_price ASC, b.submitted_at ASC
  `).all(id);

  const rankings = rankingService.getRankings(id);

  const logs = db.prepare(`
    SELECT * FROM auction_logs
    WHERE rfq_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(id);

  const priceHistory = rankingService.getBidHistory(id);

  return { rfq, bids, rankings, logs, priceHistory };
}

module.exports = { createRFQ, getAllRFQs, getRFQById };
