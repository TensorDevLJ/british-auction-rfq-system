/**
 * routes/rfq.routes.js
 */
const router = require('express').Router();
const rfqController = require('../controllers/rfq.controller');

router.get('/',    rfqController.getAllRFQs);
router.post('/',   rfqController.createRFQ);
router.get('/:id', rfqController.getRFQById);

module.exports = router;
