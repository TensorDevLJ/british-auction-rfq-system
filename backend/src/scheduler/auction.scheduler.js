/**
 * scheduler/auction.scheduler.js
 * Runs every 30 seconds to close expired auctions and activate pending ones
 */
const cron = require('node-cron');
const { closeExpiredAuctions } = require('../services/auction.service');

function startAuctionScheduler(io) {
  // Run every 30 seconds
  cron.schedule('*/30 * * * * *', () => {
    try {
      const closed = closeExpiredAuctions(io);
      if (closed.length > 0) {
        console.log(`[Scheduler] Processed ${closed.length} auction(s)`);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err.message);
    }
  });

  console.log('⏰ Auction scheduler started (every 30 seconds)');
}

module.exports = { startAuctionScheduler };
