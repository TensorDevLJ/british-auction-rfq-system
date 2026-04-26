/**
 * models/supplier.model.js
 */
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');

function getAllSuppliers() {
  return getDB().prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
}

function getSupplierById(id) {
  return getDB().prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
}

function getOrCreateSupplierByName(name, email = null) {
  const db = getDB();
  let supplier = db.prepare('SELECT * FROM suppliers WHERE name = ?').get(name.trim());
  
  if (!supplier) {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO suppliers (id, name, email, created_at) VALUES (?, ?, ?, ?)
    `).run(id, name.trim(), email, now);
    supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  }
  
  return supplier;
}

function createSupplier({ name, email, company }) {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM suppliers WHERE name = ?').get(name.trim());
  
  if (existing) {
    throw Object.assign(new Error('Supplier already exists'), { status: 409 });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO suppliers (id, name, email, company, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name.trim(), email ?? null, company ?? null, now);

  return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
}

module.exports = { getAllSuppliers, getSupplierById, getOrCreateSupplierByName, createSupplier };
