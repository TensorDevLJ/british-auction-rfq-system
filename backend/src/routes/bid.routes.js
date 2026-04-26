/**
 * routes/bid.routes.js
 */
const router = require('express').Router({ mergeParams: true });
const bidController = require('../controllers/bid.controller');

router.post('/',   bidController.submitBidHandler);
router.get('/',    bidController.getBidsByRFQ);

module.exports = router;
