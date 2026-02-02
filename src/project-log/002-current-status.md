# FactorySphere – Current Status (Updated)

## Date
31 / 01 / 2026

---

## 1️⃣ Goal (Project Target)
Build a real industrial "Control Center" web app (Windows-like command center UI) that can be upgraded later to connect with real Factory IT/PLC systems for real data ingestion.

Core expectations:
- Dark industrial UI (galaxy style)
- Responsive layout
- Sidebar + Topbar like a real control center
- Clear navigation for monitoring modules (Stations/Devices, Alarms, Downtime, Analytics, Cameras)
- Ready for future integration (API/PLC/IT network)

---

## 2️⃣ Completed / Fixed (So Far)

### ✅ Routing & Auth Guard (Important Fix)
Problem:
- After `npm start`, app sometimes opened Dashboard first, and user had to logout to see Login.

Fix:
- Added a proper routing guard logic:
  - If NOT authenticated → protected routes redirect to `/`
  - If authenticated → `/` redirects to `/dashboard`

Auth state currently depends on:
- `localStorage.role`
- `localStorage.userEmail`

File involved:
- `src/routes/AppRoutes.js` (replaced with guarded routing)

Result:
- Correct behavior for login flow and protected routes.

---

### ✅ Sidebar Menu Scope Updated (Control Center Scope)
Problem:
- Sidebar had unrelated items (HR, Material Planning, etc.)

Fix:
- Sidebar now matches industrial control-center modules.

Expected items:
- Dashboard (+ LIVE badge)
- Stations & Devices
- Live Alarms
- Downtime & Maintenance
- Analytics
- Cameras

---

### ✅ Logo Integration (Partial)
- Logo was added in UI in some places, but path/import issues happened repeatedly due to folder path mismatch.
- Current state: logo should be referenced correctly from `src/assets/` depending on component file location.

---

## 3️⃣ Known Issues / Open Items

### 🔶 UI/UX Still Needs Upgrade
Current UI is functional but not yet the desired "high-end control center" quality:
- Login page style is not acceptable (too basic / white / not industrial enough)
- Dashboard layout alignment can break (especially after login or on different resolutions)
- Needs better fonts, spacing, icon-based industrial navigation, and a stronger galaxy theme
- LIVE badge needs to be more polished and clickable (action/state)

### 🔶 Assets Path Inconsistency
We repeatedly saw errors like:
- Can't resolve `../assets/logo.png`

Root cause:
- Import paths differ depending on where Sidebar/Topbar/Layout are located.

We must enforce ONE clear rule:
- Keep logo at: `src/assets/logo.png`
- Import from:
  - `../../assets/logo.png` (if file is under `src/components/layout/`)
  - `../assets/logo.png` (if file is under `src/layout/`)

We will standardize the layout folder and imports in the next step.

---

## 4️⃣ Current App Structure (Observed)
Main folders relevant now:
- `src/components/layout/`  (Layout system)
- `src/routes/`             (AppRoutes)
- `src/pages/`              (Login/Dashboard pages)
- `src/assets/`             (logo.png and future UI assets)

---

## 5️⃣ Next Step (Phase B)
Phase B – UI/UX upgrade + responsive control center layout standardization:

1) Finalize layout folder standard:
   - Ensure `Layout.jsx`, `Sidebar.js`, `Topbar.js` are stable in one folder
   - Fix logo import path permanently

2) Upgrade Login UI:
   - Dark glass/galaxy style
   - Better typography
   - Smooth transitions (hover/focus)
   - Professional logo badge (circular)

3) Upgrade Dashboard UI baseline:
   - Consistent spacing
   - Responsive behavior (collapse sidebar on small screens)
   - Icon menu + active state animation
   - Topbar: Connection badge, time, shift, role, email, logout

4) Add Cameras page scaffold:
   - Simple placeholder cards + future RTSP/streams integration plan

---

## 6️⃣ Notes (Integration Readiness)
This UI must remain upgradeable:
- Future backend integration: IT network / PLC / OPC-UA / MQTT / REST
- Real-time stream: WebSocket/SSE
- Database: later (Timescale/Postgres)

Current mode:
- Dev login only (role/email stored in localStorage)
