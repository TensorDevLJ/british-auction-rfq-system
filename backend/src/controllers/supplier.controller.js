/**
 * controllers/supplier.controller.js
 */
const supplierModel = require('../models/supplier.model');

async function getAllSuppliers(req, res, next) {
  try {
    const suppliers = supplierModel.getAllSuppliers();
    return res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
}

async function createSupplier(req, res, next) {
  try {
    const { name, email, company } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    
    const supplier = supplierModel.createSupplier({ name, email, company });
    return res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllSuppliers, createSupplier };
