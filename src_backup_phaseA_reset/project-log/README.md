# FactorySphere – Industrial Command Center (Frontend)

## Updated
31 / 01 / 2026

---

## What is this?
FactorySphere is a web-based industrial "Control Center" UI designed to monitor factory stations/devices in real-time and later connect to real IT/PLC systems for real production, alarm, downtime, and camera data.

---

## Current Features (Dev Stage)
- React app runs via `npm start`
- Dev login (email/password + role selection)
- Protected routes (auth guard):
  - Not logged in → redirected to `/`
  - Logged in → `/` redirects to `/dashboard`
- Sidebar navigation for:
  - Dashboard
  - Stations & Devices
  - Live Alarms
  - Downtime & Maintenance
  - Analytics
  - Cameras

Auth placeholder uses:
- `localStorage.role`
- `localStorage.userEmail`

---

## Run Locally

### Install
```bash
npm install
