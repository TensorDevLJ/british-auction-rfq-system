/**
 * database/seed.js
 * Seeds the database with sample data
 * Run: npm run seed
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { getDB, initDB } = require('./db');

initDB();
const db = getDB();

// Sample suppliers
const suppliers = [
  { id: uuidv4(), name: 'FastFreight Co.', email: 'ops@fastfreight.com', company: 'FastFreight Inc.' },
  { id: uuidv4(), name: 'Global Logistics Ltd', email: 'bids@globallogistics.com', company: 'Global Logistics Group' },
  { id: uuidv4(), name: 'Speedy Cargo Inc.', email: 'quotes@speedycargo.com', company: 'Speedy Cargo Corp' },
  { id: uuidv4(), name: 'Ocean Carriers SA', email: 'rfq@oceancarriers.com', company: 'Ocean Carriers Inc' },
  { id: uuidv4(), name: 'SkyRoute Freight', email: 'tender@skyroute.com', company: 'SkyRoute Aviation' },
];

const insertSupplier = db.prepare(`
  INSERT OR IGNORE INTO suppliers (id, name, email, company, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

suppliers.forEach(s => {
  insertSupplier.run(s.id, s.name, s.email, s.company, new Date().toISOString());
  console.log(`✅ Seeded supplier: ${s.name}`);
});

// Demo RFQ
const now = new Date();
const startTime = new Date(now.getTime() + 1 * 60 * 1000);              // +1 min
const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);           // +2 hrs
const forcedEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);         // +3 hrs

const rfqId = uuidv4();
db.prepare(`
  INSERT OR IGNORE INTO rfqs (
    id, name, description, start_time, end_time, forced_end_time,
    trigger_window, extension_duration, extension_type, status, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  rfqId,
  'Demo Auction - Freight Mumbai to Rotterdam',
  'Sample RFQ for demonstration. Feel free to bid!',
  startTime.toISOString(),
  endTime.toISOString(),
  forcedEnd.toISOString(),
  10,
  5,
  'L1_CHANGE',
  'PENDING',
  new Date().toISOString(),
  new Date().toISOString()
);

console.log(`✅ Seeded demo RFQ: ${rfqId}`);
console.log('\n✨ Database seeded! Open http://localhost:5173 to start bidding.\n');

process.exit(0);
