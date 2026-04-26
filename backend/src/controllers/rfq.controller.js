/**
 * controllers/rfq.controller.js
 */
const rfqModel = require('../models/rfq.model');
const { logEvent } = require('../services/auction.service');

async function createRFQ(req, res, next) {
  try {
    const {
      name, description,
      start_time, end_time, forced_end_time,
      trigger_window, extension_duration, extension_type
    } = req.body;

    const required = [
      'name', 'start_time', 'end_time', 'forced_end_time',
      'trigger_window', 'extension_duration', 'extension_type'
    ];

    for (const field of required) {
      if (req.body[field] == null || req.body[field] === '') {
        return res.status(400).json({ success: false, message: `${field} is required` });
      }
    }

    if (!['ANY_BID', 'RANK_CHANGE', 'L1_CHANGE'].includes(extension_type)) {
      return res.status(400).json({
        success: false,
        message: 'extension_type must be: ANY_BID, RANK_CHANGE, or L1_CHANGE'
      });
    }

    const rfq = rfqModel.createRFQ({
      name, description,
      start_time, end_time, forced_end_time,
      trigger_window: parseInt(trigger_window, 10),
      extension_duration: parseInt(extension_duration, 10),
      extension_type
    });

    logEvent(rfq.id, 'RFQ_CREATED', `RFQ "${rfq.name}" created`);

    req.app.get('io')?.emit('rfq-list-update');

    return res.status(201).json({ success: true, data: rfq });
  } catch (err) {
    next(err);
  }
}

async function getAllRFQs(req, res, next) {
  try {
    const { status } = req.query;
    const rfqs = rfqModel.getAllRFQs({ status });
    return res.json({ success: true, data: rfqs });
  } catch (err) {
    next(err);
  }
}

async function getRFQById(req, res, next) {
  try {
    const rfq = rfqModel.getRFQById(req.params.id);
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
    return res.json({ success: true, data: rfq });
  } catch (err) {
    next(err);
  }
}

module.exports = { createRFQ, getAllRFQs, getRFQById };
