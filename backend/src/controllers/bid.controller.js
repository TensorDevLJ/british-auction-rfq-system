/**
 * controllers/bid.controller.js - ENHANCED with full quote fields
 */
const bidModel = require('../models/bid.model');
const supplierModel = require('../models/supplier.model');
const { submitBid } = require('../services/auction.service');

async function submitBidHandler(req, res, next) {
  try {
    const { rfq_id } = req.params;
    const {
      supplier_name,
      supplier_email,
      carrier_name,
      freight_charges,
      origin_charges,
      destination_charges,
      transit_time,
      quote_validity
    } = req.body;

    // Validate required fields
    const required = [
      'supplier_name', 'carrier_name', 'freight_charges', 'origin_charges',
      'destination_charges', 'transit_time', 'quote_validity'
    ];

    for (const field of required) {
      if (req.body[field] == null || req.body[field] === '') {
        return res.status(400).json({ success: false, message: `${field} is required` });
      }
    }

    // Get or create supplier
    const supplier = supplierModel.getOrCreateSupplierByName(
      supplier_name,
      supplier_email
    );

    // Validate numeric fields
    const freight = parseFloat(freight_charges);
    const origin = parseFloat(origin_charges);
    const dest = parseFloat(destination_charges);
    const transit = parseInt(transit_time, 10);
    const valid = parseInt(quote_validity, 10);

    if ([freight, origin, dest].some(v => isNaN(v) || v < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Charges must be non-negative numbers'
      });
    }

    if ([transit, valid].some(v => isNaN(v) || v <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Transit time and validity must be positive integers'
      });
    }

    const io = req.app.get('io');

    const result = submitBid(rfq_id, supplier.id, {
      carrier_name,
      freight_charges: freight,
      origin_charges: origin,
      destination_charges: dest,
      transit_time: transit,
      quote_validity: valid
    }, io);

    return res.status(201).json({ success: true, data: result });

  } catch (err) {
    next(err);
  }
}

async function getBidsByRFQ(req, res, next) {
  try {
    const bids = bidModel.getBidsByRFQ(req.params.rfq_id);
    return res.json({ success: true, data: bids });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitBidHandler, getBidsByRFQ };
