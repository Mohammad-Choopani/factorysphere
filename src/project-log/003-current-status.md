# FactorySphere — Current Status (Phase A)

## Date
Feb 1, 2026 (America/Toronto)

---

## 1) Phase A — Goal (Locked Scope)
Build a professional and stable industrial UI foundation with:
- Industrial-grade UI (Control Center style)
- Dev-mode Login (localStorage based)
- Stable Routing + Guard (no redirect loops / no unexpected dashboard load)
- Architecture ready for RBAC (roles + permissions) and future expansion

Out of Scope (Phase A):
- Real PLC/MQTT/OPC-UA connectivity
- Real-time streaming (SSE/WebSocket)
- Real actions (PRINT / SHIFT CHANGE / etc. -> mock only)
- Accurate station/sub-station modeling
- Advanced KPI/OEE analytics
- AI/Vision/Camera processing

Definition of Done (Phase A):
- Login is predictable and stable
- Route protection is correct and consistent
- App has a clean industrial layout baseline
- RBAC foundations exist (roles/permissions locked), menu/routes become permission-based next

---

## 2) Current Project Structure (src/)
src/
│  .env
│  App.css
│  App.js
│  App.test.js
│  index.css
│  index.js
│  logo.svg
│  reportWebVitals.js
│  setupTests.js
│
├─ app/
│
├─ assets/
│  └─ logo.png
│
├─ auth/
│  ├─ auth.store.js
│  ├─ ProtectedRoute.js
│  └─ useAuth.js
│
├─ components/
│  ├─ common/
│  └─ layout/
│     ├─ Layout.js
│     ├─ Layout.jsx
│     ├─ Sidebar.js
│     └─ Topbar.js
│
├─ data/
│  └─ mock/
│     ├─ plant3.units.mock.js
│     └─ stations.mock.js
│
├─ pages/
│  ├─ AlarmsPage.js
│  ├─ AnalyticsPage.js
│  ├─ CamerasPage.js
│  ├─ DashboardPage.js
│  ├─ DataAnalysisPage.jsx
│  ├─ DevicesPage.js
│  ├─ DowntimePage.js
│  ├─ HRPage.jsx
│  ├─ LoginPage.js
│  ├─ LoginPage.jsx
│  ├─ MaterialPlanningPage.jsx
│  └─ ReportsPage.js
│
├─ project-log/
│  ├─ 001-current-status.md
│  ├─ 002-current-status.md
│  └─ README.md
│
├─ routes/
│  └─ AppRoutes.js
│
├─ services/
│  └─ stations.service.js
│
├─ theme/
│  ├─ globals.css
│  └─ theme.js
│
└─ utils/
   ├─ permissions.js
   └─ roles.js

---

## 3) Core Fixes (Locked / Do Not Break)

### 3.1 Auth Flow Stable
- If NOT authenticated: no protected route can be opened
- Access /dashboard without login -> redirect to / (Login)
- Logout clears session and returns to Login

### 3.2 Root Cause of Previous Overload (Fixed)
Previously Layout + Routes arrangement caused dashboard to appear before login sometimes.
Now fixed via proper Guard + Protected Layout nesting.

---

## 4) Single Source of Truth Files (Phase A Backbone)
These are the "spine" of Phase A. Keep them stable:

1) src/App.js
2) src/routes/AppRoutes.js
3) src/auth/ProtectedRoute.js
4) src/auth/useAuth.js

---

## 5) Critical Risk Controls

### 5.1 Duplicate Login Page Files (Must Fix)
Currently both exist:
- src/pages/LoginPage.js
- src/pages/LoginPage.jsx

Rule:
- Only ONE must remain active (prefer .js)
- Rename the other to: LoginPage.old.jsx (or remove)
Reason:
- Prevent import ambiguity and unexpected build/runtime behavior.

---

## 6) Known Warnings
### 6.1 mediapipe sourcemap warning
Safe to ignore for Phase A.
Reason: @mediapipe/tasks-vision does not publish .map files; CRA/Webpack shows warning.

---

## 7) Next Steps (Phase A Continuation)

### Step A — Industrial UI Finalization
- Professional Logo system (3D frame + glow + scanline)
- Advanced hamburger behavior:
  - Desktop: collapse/expand
  - Mobile: drawer + backdrop blur
- Sidebar spacing and layout standards

### Step B — Real RBAC Enablement
- Lock roles.js + permissions.js
- Menu and routes become permission-based
- Each role lands on its own default dashboard (role-based landing)
