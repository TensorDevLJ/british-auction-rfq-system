/**
 * index.js - Main Server Entry Point
 * 
 * Setup:
 * - Express app with middleware
 * - Socket.IO for real-time communication
 * - All REST API routes
 * - Error handling
 * - Auction scheduler
 */
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { initDB } = require('./database/db');
const rfqRoutes = require('./routes/rfq.routes');
const bidRoutes = require('./routes/bid.routes');
const supplierRoutes = require('./routes/supplier.routes');
const { startAuctionScheduler } = require('./scheduler/auction.scheduler');
const errorHandler = require('./middleware/errorHandler');

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.use('/api/rfqs', rfqRoutes);
app.use('/api/rfqs/:rfq_id/bids', bidRoutes);
app.use('/api/suppliers', supplierRoutes);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() }),
);

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════════════════
// SOCKET.IO REAL-TIME COMMUNICATION
// ═══════════════════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join specific RFQ room for live updates
  socket.on('join-rfq', (rfqId) => {
    socket.join(`rfq-${rfqId}`);
    console.log(`  → ${socket.id} joined rfq-${rfqId}`);
  });

  socket.on('leave-rfq', (rfqId) => {
    socket.leave(`rfq-${rfqId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT ?? '5000', 10);

initDB();
startAuctionScheduler(io);

server.listen(PORT, () => {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀  British Auction API Server Started`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   API:      http://localhost:${PORT}/api`);
  console.log(`   Health:   http://localhost:${PORT}/api/health`);
  console.log(`   Frontend: ${FRONTEND_URL}`);
  console.log(`   Env:      ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`${'═'.repeat(70)}\n`);
});
