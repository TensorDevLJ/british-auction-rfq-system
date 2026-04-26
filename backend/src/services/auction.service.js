/**
 * services/auction.service.js - ENHANCED
 * 
 * Features:
 * - All 3 extension trigger types (ANY_BID, RANK_CHANGE, L1_CHANGE)
 * - Proper ranking with L1 detection
 * - Activity logging for all events
 * - Rate limiting
 * - Full quote field support
 */

const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const rankingService = require('./ranking.service');

const BID_COOLDOWN_SECONDS = parseInt(process.env.BID_COOLDOWN_SECONDS ?? '5', 10);

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION RULE EVALUATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluates if extension should trigger based on rule type
 */
function evaluateExtensionTrigger(rfq, bidSubmissionTime, previousL1Id, newL1Id, rankingChanged) {
  const triggerWindowStart = new Date(
    new Date(rfq.end_time).getTime() - rfq.trigger_window * 60 * 1000
  );

  const isInTriggerWindow = bidSubmissionTime >= triggerWindowStart && 
                            bidSubmissionTime < new Date(rfq.end_time);

  if (!isInTriggerWindow) {
    return { triggered: false, reason: null };
  }

  let triggered = false;
  let reason = '';

  switch (rfq.extension_type) {
    case 'ANY_BID':
      triggered = true;
      reason = `ANY_BID: Bid received in trigger window (last ${rfq.trigger_window} min)`;
      break;

    case 'RANK_CHANGE':
      triggered = rankingChanged;
      reason = rankingChanged 
        ? `RANK_CHANGE: Supplier ranking changed in trigger window`
        : null;
      break;

    case 'L1_CHANGE':
      triggered = previousL1Id !== newL1Id;
      reason = triggered
        ? `L1_CHANGE: Lowest bidder changed in trigger window`
        : null;
      break;
  }

  return { triggered, reason };
}

/**
 * Calculate new close time with forced close cap
 */
function calculateNewCloseTime(currentCloseTime, extensionDuration, forcedCloseTime) {
  const newCloseTime = new Date(currentCloseTime.getTime() + extensionDuration * 60 * 1000);
  return newCloseTime > forcedCloseTime ? forcedCloseTime : newCloseTime;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BID SUBMISSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * submitBid - Core auction engine function
 * 
 * Process:
 * 1. Load and validate RFQ
 * 2. Check rate limit (anti-spam)
 * 3. Get previous rankings (for change detection)
 * 4. Store bid with FULL quote details
 * 5. Recalculate rankings
 * 6. Detect L1 change and ranking changes
 * 7. Evaluate extension trigger
 * 8. Update close time if triggered
 * 9. Log all events
 * 10. Emit Socket.IO events
 */
function submitBid(rfqId, supplierId, bidData, io) {
  const db = getDB();
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    // ─────────────────────────────────────────────────────────────────────
    // 1. LOAD & VALIDATE RFQ
    // ─────────────────────────────────────────────────────────────────────
    const rfq = db.prepare('SELECT * FROM rfqs WHERE id = ?').get(rfqId);
    if (!rfq) {
      throw Object.assign(new Error('RFQ not found'), { status: 404 });
    }

    const endTime = new Date(rfq.end_time);
    const forcedEnd = new Date(rfq.forced_end_time);

    // Check RFQ status
    if (rfq.status === 'PENDING') {
      throw Object.assign(
        new Error('Auction has not started yet'),
        { status: 400 }
      );
    }
    if (rfq.status !== 'ACTIVE') {
      throw Object.assign(
        new Error(`Auction is ${rfq.status} - no more bids accepted`),
        { status: 400 }
      );
    }
    if (now >= endTime) {
      throw Object.assign(
        new Error('Auction has closed - bids no longer accepted'),
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. RATE LIMIT CHECK (Anti-spam)
    // ─────────────────────────────────────────────────────────────────────
    const lastBid = db.prepare(`
      SELECT submitted_at FROM bids
      WHERE rfq_id = ? AND supplier_id = ?
      ORDER BY submitted_at DESC LIMIT 1
    `).get(rfqId, supplierId);

    if (lastBid) {
      const elapsed = (now - new Date(lastBid.submitted_at)) / 1000;
      if (elapsed < BID_COOLDOWN_SECONDS) {
        const wait = Math.ceil(BID_COOLDOWN_SECONDS - elapsed);
        throw Object.assign(
          new Error(`Rate limit: wait ${wait}s before next bid`),
          { status: 429 }
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. GET PREVIOUS RANKINGS (for change detection)
    // ─────────────────────────────────────────────────────────────────────
    const previousRankings = rankingService.getRankings(rfqId);
    const previousL1 = previousRankings.length > 0 ? previousRankings[0] : null;

    // ─────────────────────────────────────────────────────────────────────
    // 4. CALCULATE TOTAL PRICE & STORE BID
    // ─────────────────────────────────────────────────────────────────────
    const totalPrice =
      bidData.freight_charges + bidData.origin_charges + bidData.destination_charges;

    // Validate charges
    if (bidData.freight_charges < 0 || bidData.origin_charges < 0 || bidData.destination_charges < 0) {
      throw Object.assign(
        new Error('Charges cannot be negative'),
        { status: 400 }
      );
    }

    const bidId = uuidv4();

    db.prepare(`
      INSERT INTO bids (
        id, rfq_id, supplier_id, carrier_name,
        freight_charges, origin_charges, destination_charges,
        total_price, transit_time, quote_validity, submitted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bidId,
      rfqId,
      supplierId,
      bidData.carrier_name,
      bidData.freight_charges,
      bidData.origin_charges,
      bidData.destination_charges,
      totalPrice,
      bidData.transit_time,
      bidData.quote_validity,
      nowIso
    );

    // ─────────────────────────────────────────────────────────────────────
    // 5. RECALCULATE RANKINGS
    // ─────────────────────────────────────────────────────────────────────
    const newRankings = rankingService.getRankings(rfqId);
    const newL1 = newRankings.length > 0 ? newRankings[0] : null;
    const bidderEntry = newRankings.find(r => r.supplier_id === supplierId);

    // ─────────────────────────────────────────────────────────────────────
    // 6. DETECT CHANGES
    // ─────────────────────────────────────────────────────────────────────
    const rankingChanged = rankingService.hasAnyRankChanged(previousRankings, newRankings);
    const l1Changed = rankingService.hasL1Changed(previousRankings, newRankings);

    // ─────────────────────────────────────────────────────────────────────
    // 7. LOG BID SUBMISSION
    // ─────────────────────────────────────────────────────────────────────
    const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(supplierId);
    const supplierName = supplier?.name ?? supplierId;

    logEvent(rfqId, 'BID_SUBMITTED', 
      `${supplierName} submitted bid of $${totalPrice.toFixed(2)} (Rank: ${bidderEntry?.label ?? '?'})`,
      {
        bidId,
        supplierId,
        totalPrice,
        rank: bidderEntry?.rank,
        carrierName: bidData.carrier_name
      }
    );

    // ─────────────────────────────────────────────────────────────────────
    // 8. LOG RANKING CHANGES
    // ─────────────────────────────────────────────────────────────────────
    if (l1Changed) {
      logEvent(rfqId, 'L1_CHANGED',
        `🏆 NEW L1: ${newL1.supplier_name} at $${newL1.best_price.toFixed(2)}`,
        { previousL1: previousL1?.supplier_id, newL1: newL1.supplier_id }
      );

      // Notify previous L1 that they lost position
      if (previousL1) {
        createNotification(rfqId, previousL1.supplier_id, 'L1_LOST',
          'You lost L1 position',
          `${newL1.supplier_name} is now the lowest bidder at $${newL1.best_price.toFixed(2)}`
        );
      }
    } else if (rankingChanged) {
      logEvent(rfqId, 'RANKING_CHANGED',
        'Supplier rankings have changed',
        { affectedSuppliers: newRankings.map(r => ({ id: r.supplier_id, rank: r.rank })) }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 9. EVALUATE EXTENSION TRIGGER
    // ─────────────────────────────────────────────────────────────────────
    const extensionEval = evaluateExtensionTrigger(
      rfq,
      now,
      previousL1?.supplier_id ?? null,
      newL1?.supplier_id ?? null,
      rankingChanged
    );

    let updatedRfq = rfq;
    let extensionApplied = false;
    let newEndTime = endTime;

    if (extensionEval.triggered) {
      // Check if already at forced close
      if (endTime < forcedEnd) {
        newEndTime = calculateNewCloseTime(endTime, rfq.extension_duration, forcedEnd);
        const newEndIso = newEndTime.toISOString();

        // Update RFQ
        db.prepare(`
          UPDATE rfqs SET end_time = ?, updated_at = ? WHERE id = ?
        `).run(newEndIso, nowIso, rfqId);

        extensionApplied = true;

        // Log extension
        const capped = newEndTime.getTime() === forcedEnd.getTime();
        logEvent(rfqId, 'TIME_EXTENDED',
          `⏱️ Auction extended by ${rfq.extension_duration} min (${extensionEval.reason})` +
          (capped ? ' [CAPPED at forced close]' : ''),
          {
            previousEnd: endTime.toISOString(),
            newEnd: newEndIso,
            reason: extensionEval.reason,
            capped
          }
        );

        // Notify all suppliers
        notifyAllSuppliersInRfq(rfqId, 'AUCTION_EXTENDED',
          'Auction Extended!',
          `Auction extended to ${newEndTime.toLocaleTimeString()}`
        );

        updatedRfq = db.prepare('SELECT * FROM rfqs WHERE id = ?').get(rfqId);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 10. EMIT REAL-TIME SOCKET.IO EVENTS
    // ─────────────────────────────────────────────────────────────────────
    if (io) {
      io.to(`rfq-${rfqId}`).emit('bid-update', {
        bid: {
          id: bidId,
          supplier_id: supplierId,
          supplier_name: supplierName,
          carrier_name: bidData.carrier_name,
          freight_charges: bidData.freight_charges,
          origin_charges: bidData.origin_charges,
          destination_charges: bidData.destination_charges,
          total_price: totalPrice,
          transit_time: bidData.transit_time,
          validity: bidData.quote_validity,
          submitted_at: nowIso,
          rank: bidderEntry?.rank
        },
        rankings: newRankings,
        extensionApplied,
        newEndTime: newEndTime.toISOString(),
        rfq: updatedRfq,
        changes: {
          l1Changed,
          rankingChanged
        }
      });
    }

    return {
      success: true,
      bid: {
        id: bidId,
        supplier_id: supplierId,
        rank: bidderEntry?.rank,
        total_price: totalPrice
      },
      extensionApplied,
      newEndTime: newEndTime.toISOString()
    };

  } catch (err) {
    console.error('[AuctionService] Error:', err.message);
    throw err;
  }
}

/**
 * Helper: Log auction event
 */
function logEvent(rfqId, eventType, description, metadata = null) {
  const db = getDB();
  db.prepare(`
    INSERT INTO auction_logs (id, rfq_id, event_type, description, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    rfqId,
    eventType,
    description,
    metadata ? JSON.stringify(metadata) : null
  );
}

/**
 * Helper: Create notification for user
 */
function createNotification(rfqId, supplierId, type, title, message) {
  const db = getDB();
  if (supplierId) {
    db.prepare(`
      INSERT INTO notifications (id, rfq_id, supplier_id, type, title, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), rfqId, supplierId, type, title, message);
  }
}

/**
 * Helper: Notify all suppliers in RFQ
 */
function notifyAllSuppliersInRfq(rfqId, type, title, message) {
  const db = getDB();
  const suppliers = db.prepare(`
    SELECT DISTINCT supplier_id FROM bids WHERE rfq_id = ?
  `).all(rfqId);
  
  for (const { supplier_id } of suppliers) {
    createNotification(rfqId, supplier_id, type, title, message);
  }
}

/**
 * closeExpiredAuctions - Run by scheduler every 30 seconds
 */
function closeExpiredAuctions(io) {
  const db = getDB();
  const now = new Date().toISOString();

  // Find auctions that should close
  const toClose = db.prepare(`
    SELECT * FROM rfqs
    WHERE status = 'ACTIVE' AND end_time <= ?
  `).all(now);

  const closed = [];

  for (const rfq of toClose) {
    const forcedPassed = rfq.forced_end_time <= now;
    const newStatus = forcedPassed ? 'FORCE_CLOSED' : 'CLOSED';

    db.prepare(`UPDATE rfqs SET status = ?, updated_at = ? WHERE id = ?`)
      .run(newStatus, now, rfq.id);

    logEvent(rfq.id, newStatus === 'FORCE_CLOSED' ? 'AUCTION_FORCE_CLOSED' : 'AUCTION_CLOSED',
      `Auction ${newStatus.replace('_', ' ').toLowerCase()}`
    );

    notifyAllSuppliersInRfq(rfq.id, 'AUCTION_CLOSED',
      'Auction Closed',
      `This auction has been ${newStatus === 'FORCE_CLOSED' ? 'force closed' : 'closed'}`
    );

    if (io) {
      io.to(`rfq-${rfq.id}`).emit('auction-closed', {
        rfqId: rfq.id,
        status: newStatus,
        closedAt: now
      });
    }

    closed.push({ id: rfq.id, status: newStatus });
  }

  // Activate pending auctions
  const toActivate = db.prepare(`
    SELECT * FROM rfqs
    WHERE status = 'PENDING' AND start_time <= ?
  `).all(now);

  for (const rfq of toActivate) {
    db.prepare(`UPDATE rfqs SET status = 'ACTIVE', updated_at = ? WHERE id = ?`)
      .run(now, rfq.id);

    logEvent(rfq.id, 'AUCTION_STARTED', '🟢 Auction is now ACTIVE');

    if (io) {
      io.to(`rfq-${rfq.id}`).emit('auction-status', { status: 'ACTIVE' });
      io.emit('rfq-list-update');
    }
  }

  return closed;
}

module.exports = { submitBid, closeExpiredAuctions, logEvent, evaluateExtensionTrigger };
