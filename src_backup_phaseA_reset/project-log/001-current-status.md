# FactorySphere — Current Status
## File: 001-current-status.md

## Date
29 / 01 / 2026

---

## Project Overview
FactorySphere is an industrial command center and digital twin platform
designed for real-time monitoring, visualization, and operational control
of factory stations and devices.

The project follows a **frontend-first, mock-driven architecture** to
stabilize UI, UX, and data contracts before backend and realtime integration.

---

## 1️⃣ Completed Work (Confirmed)

### ✅ Frontend Foundation
- React application initialized (Create React App)
- Development server running on `localhost:3000`
- Webpack builds successfully (no compile/runtime errors)

---

### ✅ Project Structure (Stabilized)
src/
├─ layout/
│ ├─ Layout.jsx ← active main layout
│ └─ Layout.js ← re-export to enforce Layout.jsx usage
├─ pages/
├─ routes/
├─ services/
├─ data/
│ └─ mock/
├─ theme/
│ ├─ theme.js
│ └─ globals.css
├─ utils/
├─ assets/
└─ project-log/

> Layout conflict between `.js` and `.jsx` resolved.
> `Layout.jsx` is now the single source of UI structure.

---

### ✅ UI / Design System
- Dark industrial theme enabled
- Inter font integrated globally
- Global design tokens added (`globals.css`)
- Glassmorphism containers
- KPI cards and status badges
- State indicators: RUN / DOWN / IDLE / STOP
- Responsive layout (desktop + mobile drawer)

---

### ✅ Layout & Navigation
- Professional Sidebar + Topbar
- Icon-based navigation
- Active route highlighting
- Responsive Drawer (mobile support)
- Centralized content rendering via `<Outlet />`

---

### ✅ Authentication (Development Mode)
- Login page functional
- Email + password fields
- Development role selector
- Authentication data stored in `localStorage`
- Redirect to `/dashboard` after login
- Logout:
  - Clears authentication keys
  - Redirects to `/login`

---

### ✅ RBAC (Role-Based Access Control)
- Centralized RBAC definitions:
  - `src/utils/roles.js`
  - `src/utils/permissions.js`
- Permissions enforced in:
  - Sidebar visibility
  - Protected routes
- Manual URL access blocked when unauthorized

---

### ✅ Data Layer (Mock-Driven)
- Canonical data model defined
- Mock data created for:
  - Stations
  - Telemetry snapshots
- Service abstraction added

Files:
- `src/data/mock/stations.mock.js`
- `src/services/stations.service.js`

UI is now backend-independent.

---

## 2️⃣ Current System State

### ✅ What Is Ready
- Stable UI foundation
- Locked layout and design direction
- Functional dev authentication
- Working RBAC
- Mock data + service layer
- Logout flow verified

### ❌ Not Started Yet
- Dashboard real KPIs
- Devices / stations data tables
- Station detail panel
- Alarm analytics & history
- Maintenance & downtime analytics
- Backend APIs
- Realtime (WebSocket / SSE)
- 3D factory visualization

---

## 3️⃣ Architectural Decisions (Locked)
- Station is the primary aggregation unit
- Telemetry ≠ Event
  - Telemetry: live snapshot
  - Event: historical record
- UI communicates only via service layer
- Mock → API → Realtime interchangeable
- RBAC defined once, reused everywhere

---

## 4️⃣ Status Summary
🟢 Foundation Phase — COMPLETE  
🟡 Feature UI Phase — READY TO START

