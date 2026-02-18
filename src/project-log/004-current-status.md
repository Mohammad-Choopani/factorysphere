# FactorySphere — Current Status (Phase A)

## Date
Feb 18, 2026 (America/Toronto)

---

## 1) Phase A — Goal (Locked Scope)

Build a professional and stable industrial UI foundation with:

- Industrial-grade UI (Control Center style)
- Dev-mode Login (localStorage based authentication)
- Stable Routing + Guard (no redirect loops / no unexpected dashboard load)
- Clean layout architecture (Sidebar + Topbar + Protected Layout shell)
- Architecture ready for RBAC (roles + permissions)

Out of Scope (Phase A):

- Real PLC / MQTT / OPC-UA connectivity
- Real-time streaming (SSE / WebSocket)
- Real production actions (PRINT / SHIFT CHANGE / etc.)
- Accurate station/sub-station CAD modeling
- Advanced KPI / OEE analytics
- AI / Vision / Camera processing

Definition of Done (Phase A):

- Login behavior is predictable and stable
- Route protection is consistent
- Layout does not render protected pages before auth
- Only authenticated users can access dashboard routes
- UI baseline is industrial-grade and presentation-ready

---

## 2) Current Project Structure (src/)

src/
│  App.js
│  index.js
│  App.css
│  index.css
│  reportWebVitals.js
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
│  └─ layout/
│     ├─ Layout.js        (re-export)
│     ├─ Layout.jsx       (main layout shell)
│     ├─ Sidebar.js
│     └─ Topbar.js
│
├─ data/
│  └─ mock/
│     ├─ plant3.units.mock.js
│     └─ stations.mock.js
│
├─ pages/
│  ├─ DashboardPage.js
│  ├─ DevicesPage.js
│  ├─ AlarmsPage.js
│  ├─ DowntimePage.js
│  ├─ AnalyticsPage.js
│  ├─ CamerasPage.js
│  ├─ ReportsPage.js
│  ├─ HRPage.jsx
│  ├─ DataAnalysisPage.jsx
│  ├─ MaterialPlanningPage.jsx
│  ├─ LoginPage.js
│  └─ LoginPage.jsx   (⚠ must remove or rename)
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

Rules:

- If NOT authenticated → no protected route renders
- Accessing `/dashboard` without auth → redirect to `/`
- Logout clears role + email from localStorage
- After logout → user must see Login immediately

Auth Storage:

- localStorage.role
- localStorage.userEmail

Auth Core Files:

- src/auth/useAuth.js
- src/auth/ProtectedRoute.js

---

### 3.2 Layout Import Control (Single Source)

Layout import chain:

AppRoutes.js
→ imports Layout from:
   "../components/layout/Layout"

Layout.js
→ re-exports Layout.jsx

This prevents:
- Ambiguity between .js / .jsx
- Unexpected layout double rendering

---

## 4) Single Source of Truth Files (Phase A Backbone)

Do not restructure without version lock:

1) src/App.js
2) src/routes/AppRoutes.js
3) src/auth/ProtectedRoute.js
4) src/auth/useAuth.js
5) src/components/layout/Layout.jsx

These define:
- Route behavior
- Guard logic
- Shell rendering
- Auth lifecycle

---

## 5) Critical Risk Controls

### 5.1 Duplicate Login Page (High Risk)

Currently both exist:

- src/pages/LoginPage.js
- src/pages/LoginPage.jsx

Action Required:

- Keep only ONE (prefer .js)
- Rename or remove the other

Reason:

- Prevent unpredictable route resolution
- Prevent unexpected dashboard rendering
- Avoid build/runtime ambiguity

---

### 5.2 Service Worker Risk

If service worker is active:

Possible side effects:

- Blank page after logout
- Old dashboard cached on cold start
- Redirect inconsistencies

Phase A recommendation:

- Disable caching for auth routes
- Prefer unregister in development

---

## 6) Known Warnings

### mediapipe sourcemap warning

Safe to ignore in Phase A.

Reason:
@mediapipe/tasks-vision does not publish sourcemap files.
CRA/Webpack shows warning but does not affect runtime.

---

## 7) Next Steps (Phase A Continuation)

### Step A — Auth Stability Hard Lock

Goal:

- No manual refresh required after logout
- No direct dashboard on cold start
- Guard logic 100% deterministic

Files to inspect:

- src/App.js
- src/routes/AppRoutes.js
- src/auth/ProtectedRoute.js
- src/index.js

---

### Step B — Industrial UI Finalization

- Sidebar spacing and typography refinement
- Hamburger behavior standardization
- Active menu state polish
- Executive-level visual consistency

---

### Step C — RBAC Activation

- Lock roles.js
- Lock permissions.js
- Make routes permission-aware
- Role-based default landing pages

---

End of Phase A Status Snapshot
