# FactorySphere — Project Log

This folder contains the official progress log and "single source of truth" status updates for FactorySphere.

## Timeline
- 001-current-status.md — Initial Phase A scope + first stabilization steps
- 002-current-status.md — Routing/Auth guard improvements (pre-final)
- 003-current-status.md — Phase A backbone locked (Auth + Guard + Routes stable) + next steps defined

## Phase A Summary (Locked)
Phase A focus:
- Professional industrial UI baseline
- Dev-mode Login (localStorage)
- Stable routing + protected layout
- Ready for RBAC (roles/permissions) and future scaling

Out of Scope for Phase A:
- Real PLC/MQTT/OPC-UA
- Real-time SSE/WS
- Real actions
- Accurate station modeling
- KPI/OEE analytics
- AI/Vision/Camera processing

## Phase A Backbone Files (Do Not Break)
- src/App.js
- src/routes/AppRoutes.js
- src/auth/ProtectedRoute.js
- src/auth/useAuth.js

## Critical Rule
Avoid duplicate page implementations (e.g., LoginPage.js and LoginPage.jsx).
Only one should remain active to prevent import ambiguity and unstable behavior.
