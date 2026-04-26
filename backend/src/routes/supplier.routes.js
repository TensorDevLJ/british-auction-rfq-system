/**
 * routes/supplier.routes.js
 */
const router = require('express').Router();
const supplierController = require('../controllers/supplier.controller');

router.get('/',   supplierController.getAllSuppliers);
router.post('/',  supplierController.createSupplier);

module.exports = router;
