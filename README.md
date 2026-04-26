---

## 🌐 Live Demo

### 🔗 Frontend
https://british-auction-frontend-likhitha.vercel.app/

### 🔗 Backend API
https://british-auction-rfq-system-backend.onrender.com

---

## 🧪 How to Test

1. Open the frontend link  
2. Create a new RFQ  
3. Submit bids  
4. Open the app in another tab to see real-time updates  
5. Observe:
   - L1/L2 ranking updates
   - Auction extension in trigger window
   - Activity log updates

---

## ⚠️ Notes

- Backend is deployed on Render (may take a few seconds to wake up)
- Database uses SQLite (data may reset on redeploy)
- Real-time updates powered by Socket.IO

---



# ⚡ British Auction RFQ System — v2.0

A production-ready **reverse auction (British auction)** system where suppliers compete by submitting progressively lower bids. Built with Node.js, React, Socket.IO, and SQLite.

---

## 🚀 Quick Start

```bash
# 1. Install all dependencies
cd british-auction-rfq
npm run install:all

# 2. Set up environment
cp backend/.env.example backend/.env

# 3. Seed sample data
npm run seed

# 4. Start backend (terminal 1)
npm run dev:backend

# 5. Start frontend (terminal 2)
npm run dev:frontend

# 6. Open http://localhost:5173
```

---

## 🧩 Features

### Core
| Feature | Status |
|---|---|
| Full quote submission (carrier, freight, origin, dest, transit, validity) | ✅ |
| Auto-calculated total price | ✅ |
| All 3 extension trigger types (ANY_BID, RANK_CHANGE, L1_CHANGE) | ✅ |
| Configurable trigger window (X) and extension duration (Y) | ✅ |
| Extension formula: `min(close + Y, forcedClose)` | ✅ |
| Activity log with all events | ✅ |
| L1 / L2 / L3 rank labels + L1 green highlight | ✅ |
| Countdown timer (live, per-second) | ✅ |
| Anti-spam bid cooldown (5 seconds) | ✅ |
| Forced close time cap | ✅ |

### Real-time
| Feature | Status |
|---|---|
| WebSocket via Socket.IO | ✅ |
| Live bid table updates (no refresh) | ✅ |
| Live extension notification | ✅ |
| Live countdown timer | ✅ |
| Live auction status change | ✅ |

### UI/UX
| Feature | Status |
|---|---|
| Toast notifications (success / error / warning) | ✅ |
| Status badges (Active, Pending, Closed, Force Closed) | ✅ |
| Bid ranking table with all charge columns | ✅ |
| Activity timeline with icons and colors | ✅ |
| Price trend chart (Recharts) | ✅ |
| Dark UI (Tailwind CSS) | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend (Vite)              │
│   RFQListPage  ─  CreateRFQPage  ─  RFQDetailPage  │
│   Components: BidTable, BidForm, Countdown, Chart  │
│   Real-time: socket.io-client via useSocket hook   │
└────────────────┬────────────────────────────────────┘
                 │  REST API + WebSocket
                 ▼
┌─────────────────────────────────────────────────────┐
│              Node.js / Express Backend              │
│  Routes → Controllers → Services → Models → DB     │
│  Socket.IO Server  ──  Cron Scheduler (30s)        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              SQLite (better-sqlite3)                │
│  rfqs ─ bids ─ suppliers ─ auction_logs            │
│  notifications ─ bid_rate_limits                   │
└─────────────────────────────────────────────────────┘
```

---

## 📡 API Reference

### RFQs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/rfqs` | List all RFQs |
| POST | `/api/rfqs` | Create new RFQ |
| GET | `/api/rfqs/:id` | Get RFQ detail (with bids, rankings, logs, chart data) |

**Create RFQ body:**
```json
{
  "name": "Freight Mumbai → Rotterdam",
  "description": "Q2 2024 tender",
  "start_time": "2024-06-01T10:00:00Z",
  "end_time": "2024-06-01T12:00:00Z",
  "forced_end_time": "2024-06-01T13:00:00Z",
  "trigger_window": 10,
  "extension_duration": 5,
  "extension_type": "L1_CHANGE"
}
```

### Bids

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/rfqs/:rfq_id/bids` | Submit quote |
| GET | `/api/rfqs/:rfq_id/bids` | List all bids |

**Submit bid body:**
```json
{
  "supplier_name": "FastFreight Co.",
  "carrier_name": "Maersk Line",
  "freight_charges": 3200.00,
  "origin_charges": 450.00,
  "destination_charges": 380.00,
  "transit_time": 21,
  "quote_validity": 30
}
```

`total_price` is auto-calculated: `freight + origin + destination`

### Suppliers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Create supplier |

---

## 📊 Database Schema

```sql
-- Suppliers
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  company TEXT,
  created_at TEXT NOT NULL
);

-- RFQs (Auctions)
CREATE TABLE rfqs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  forced_end_time TEXT NOT NULL,
  trigger_window INTEGER NOT NULL,      -- X minutes
  extension_duration INTEGER NOT NULL,  -- Y minutes
  extension_type TEXT NOT NULL,         -- ANY_BID | RANK_CHANGE | L1_CHANGE
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Bids (Full Quote)
CREATE TABLE bids (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  freight_charges REAL NOT NULL,
  origin_charges REAL NOT NULL,
  destination_charges REAL NOT NULL,
  total_price REAL NOT NULL,           -- auto = freight + origin + dest
  transit_time INTEGER NOT NULL,       -- days
  quote_validity INTEGER NOT NULL,     -- days
  submitted_at TEXT NOT NULL
);

-- Activity Log
CREATE TABLE auction_logs (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT,                        -- JSON
  created_at TEXT NOT NULL
);
```

---

## ⚡ Extension Logic

### How it works

When a bid arrives:

1. Check if current time is within the **trigger window** (last X minutes before close)
2. If yes, evaluate the **extension rule**:
   - `ANY_BID`: Always extend
   - `RANK_CHANGE`: Extend if any supplier's rank changed
   - `L1_CHANGE`: Extend only if the lowest bidder (L1) changed
3. If triggered, calculate new close time:
   ```
   newCloseTime = min(currentCloseTime + Y, forcedCloseTime)
   ```
4. Update `end_time` in DB
5. Emit `bid-update` via Socket.IO with `extensionApplied: true`

### Extension Types Compared

| Rule | Sensitivity | Best For |
|---|---|---|
| `ANY_BID` | High | Short auctions, many suppliers |
| `RANK_CHANGE` | Medium | Most competitive scenarios |
| `L1_CHANGE` | Low | Long auctions, price-sensitive procurement |

---

## 🔌 WebSocket Events

### Client → Server
```js
socket.emit('join-rfq', rfqId)   // Join auction room
socket.emit('leave-rfq', rfqId)  // Leave auction room
```

### Server → Client
```js
// New bid + ranking update
socket.on('bid-update', { bid, rankings, extensionApplied, newEndTime, rfq, changes })

// Auction closed by scheduler
socket.on('auction-closed', { rfqId, status, closedAt })

// Status change (PENDING → ACTIVE)
socket.on('auction-status', { status })

// Refresh RFQ list
socket.on('rfq-list-update')
```

---

## 🧱 Project Structure

```
british-auction-rfq/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.js         ← Schema, init, connection
│   │   │   └── seed.js       ← Sample data
│   │   ├── services/
│   │   │   ├── auction.service.js   ← Core engine + extension logic
│   │   │   └── ranking.service.js   ← Ranking + L1 detection
│   │   ├── models/
│   │   │   ├── rfq.model.js
│   │   │   ├── bid.model.js
│   │   │   └── supplier.model.js
│   │   ├── controllers/
│   │   │   ├── rfq.controller.js
│   │   │   ├── bid.controller.js
│   │   │   └── supplier.controller.js
│   │   ├── routes/
│   │   │   ├── rfq.routes.js
│   │   │   ├── bid.routes.js
│   │   │   └── supplier.routes.js
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   ├── scheduler/
│   │   │   └── auction.scheduler.js
│   │   └── index.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── CountdownTimer.jsx
│   │   │   ├── BidTable.jsx
│   │   │   ├── BidForm.jsx
│   │   │   ├── ActivityLog.jsx
│   │   │   ├── BidHistoryChart.jsx
│   │   │   └── Toast.jsx
│   │   ├── context/
│   │   │   └── notificationStore.js
│   │   ├── hooks/
│   │   │   └── useSocket.js
│   │   ├── pages/
│   │   │   ├── RFQListPage.jsx
│   │   │   ├── CreateRFQPage.jsx
│   │   │   └── RFQDetailPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
│
└── README.md
```

---

## 🔧 Environment Variables

**backend/.env**
```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DB_PATH=./data/auction.db
BID_COOLDOWN_SECONDS=5
```

**frontend/.env** (optional, uses Vite proxy by default)
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🛡️ Validation Rules

| Rule | Enforcement |
|---|---|
| start < close < forced close | DB constraint + controller validation |
| Charges ≥ 0 | DB CHECK + controller |
| transit_time > 0, quote_validity > 0 | DB CHECK + controller |
| Cannot bid when status ≠ ACTIVE | Auction service |
| Cannot bid after end_time | Auction service |
| Anti-spam cooldown (5s) | Rate limit via bid history |
| extension_type must be valid | DB CHECK + controller |


# Built with Love By LikhithaJagadeesh
