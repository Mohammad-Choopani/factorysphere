FactorySphere — Current Status (Phase A)
Date

Feb 19, 2026 (America/Toronto)

1) Phase A — Goal (Locked Scope)

Build a professional and stable industrial UI foundation with:

Industrial-grade UI (Control Center style)

Dev-mode Login (localStorage based authentication)

Stable Routing + Guard (no redirect loops / no unexpected dashboard load)

Clean layout architecture (Sidebar + Topbar + Protected Layout shell)

Architecture ready for RBAC (roles + permissions)

Mobile-first polish (no clipping / no border overlap / pixel-stable UI)

Out of Scope (Phase A):

Real PLC / MQTT / OPC-UA connectivity

Real-time streaming (SSE / WebSocket)

Real production actions (PRINT / SHIFT CHANGE / etc.)

Accurate station/sub-station CAD modeling

Advanced KPI / OEE analytics

AI / Vision / Camera processing

Definition of Done (Phase A):

Login behavior is predictable and stable

Route protection is consistent

Layout does not render protected pages before auth

Only authenticated users can access dashboard routes

UI baseline is industrial-grade and presentation-ready

Mobile UI is stable (no clipped icons/text/chips, no border overlap)

2) Current Project Structure (src/)

src/
│ App.js
│ index.js
│ App.css
│ index.css
│ reportWebVitals.js
│
├─ assets/
│ └─ logo.png
│
├─ auth/
│ ├─ auth.store.js
│ ├─ ProtectedRoute.js
│ └─ useAuth.js
│
├─ components/
│ └─ layout/
│ ├─ Layout.js (re-export)
│ ├─ Layout.jsx (main layout shell)
│ ├─ Sidebar.js
│ └─ Topbar.js
│
├─ data/
│ └─ mock/
│ ├─ plant3.units.mock.js
│ └─ stations.mock.js
│
├─ pages/
│ ├─ DashboardPage.js
│ ├─ DevicesPage.js
│ ├─ AlarmsPage.js
│ ├─ DowntimePage.js
│ ├─ AnalyticsPage.js
│ ├─ CamerasPage.js
│ ├─ ReportsPage.js
│ ├─ HRPage.jsx
│ ├─ DataAnalysisPage.jsx
│ ├─ MaterialPlanningPage.jsx
│ ├─ LoginPage.js
│ └─ LoginPage.jsx (⚠ must remove or rename)
│
├─ project-log/
│ ├─ 001-current-status.md
│ ├─ 002-current-status.md
│ ├─ 003-current-status.md
│ └─ 004-current-status.md
│
├─ routes/
│ └─ AppRoutes.js
│
├─ services/
│ └─ stations.service.js
│
├─ theme/
│ ├─ globals.css
│ └─ theme.js
│
└─ utils/
├─ permissions.js
└─ roles.js

3) Core Fixes (Locked / Do Not Break)
3.1 Auth Flow Stable

Rules:

If NOT authenticated → no protected route renders

Accessing /dashboard without auth → redirect to /

Logout clears role + email from localStorage

After logout → user must see Login immediately

Auth Storage:

localStorage.role

localStorage.userEmail

Auth Core Files:

src/auth/useAuth.js

src/auth/ProtectedRoute.js

3.2 Layout Import Control (Single Source)

Layout import chain:

AppRoutes.js
→ imports Layout from:
"../components/layout/Layout"

Layout.js
→ re-exports Layout.jsx

This prevents:

Ambiguity between .js / .jsx

Unexpected layout double rendering

3.3 Dashboard UI + Mobile Polish (Locked)

What was fixed (must not regress):

Mobile clipping issues caused by Grid spacing negative margins inside Paper

Header elements overlapping borders on small screens

Chip content bleeding outside rounded pill on mobile typography

Module list row right-side alignment and rounded-corner integrity on mobile

Primary file impacted:

src/pages/DashboardPage.js

Outcome:

Dashboard is industrial-grade, presentation-ready, and pixel-stable on mobile

Vercel deploy updates confirmed (cache/PWA risk acknowledged below)

4) Single Source of Truth Files (Phase A Backbone)

Do not restructure without version lock:

src/App.js

src/routes/AppRoutes.js

src/auth/ProtectedRoute.js

src/auth/useAuth.js

src/components/layout/Layout.jsx

These define:

Route behavior

Guard logic

Shell rendering

Auth lifecycle

5) Critical Risk Controls
5.1 Duplicate Login Page (High Risk)

Currently both exist:

src/pages/LoginPage.js

src/pages/LoginPage.jsx

Action Required:

Keep only ONE (prefer .js)

Rename or remove the other

Reason:

Prevent unpredictable route resolution

Prevent unexpected dashboard rendering

Avoid build/runtime ambiguity

5.2 Service Worker / Mobile Cache Risk (High Impact)

If service worker (PWA caching) is active:

Possible side effects:

Old UI cached on mobile after deploy (changes not visible)

Blank page after logout

Redirect inconsistencies on cold start

Phase A recommendation:

Prefer unregister in development

Avoid aggressive caching for auth routes

Treat PWA update flow as Phase B hardening task

6) Known Warnings
mediapipe sourcemap warning

Safe to ignore in Phase A.

Reason:
@mediapipe/tasks-vision does not publish sourcemap files.
CRA/Webpack shows warning but does not affect runtime.

7) Next Steps (Phase A Continuation)
Step A — Auth Stability Hard Lock (Remove Ambiguity)

Goal:

Zero ambiguity in login routing and build resolution

Prevent future auth regressions

Action:

Remove or rename src/pages/LoginPage.jsx

Ensure AppRoutes imports LoginPage from a single path

Files to inspect:

src/pages/LoginPage.js

src/routes/AppRoutes.js

Step B — Industrial UI Finalization (Layout Mobile Drawer)

Goal:

Sidebar becomes Drawer on mobile (industrial standard)

Consistent hamburger behavior + active menu polish

No layout jump / no clipped content

Files to inspect:

src/components/layout/Layout.jsx

src/components/layout/Sidebar.js

src/components/layout/Topbar.js

Step C — RBAC Activation (Permission-Aware Routes)

Goal:

Routes and modules reflect role permissions

Role-based default landing pages

Files to lock:

src/utils/roles.js

src/utils/permissions.js

src/routes/AppRoutes.js

End of Phase A Status Snapshot