import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../auth/ProtectedRoute";
import Layout from "../components/layout/Layout";

import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import DevicesPage from "../pages/DevicesPage";
import AlarmsPage from "../pages/AlarmsPage";
import DowntimePage from "../pages/DowntimePage";
import AnalyticsPage from "../pages/AnalyticsPage";
import CamerasPage from "../pages/CamerasPage";
import ReportsPage from "../pages/ReportsPage";

import { PAGE_PERMISSIONS } from "../utils/permissions";

function getRole() {
  return localStorage.getItem("role") || "";
}

function canAccess(pageKey) {
  const role = getRole();
  const allowed = PAGE_PERMISSIONS?.[pageKey] || [];
  return Boolean(role && allowed.includes(role));
}

function RoleGuard({ pageKey, children, fallback = "/dashboard" }) {
  if (!canAccess(pageKey)) return <Navigate to={fallback} replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <RoleGuard pageKey="dashboard" fallback="/">
                <DashboardPage />
              </RoleGuard>
            }
          />

          <Route
            path="/devices"
            element={
              <RoleGuard pageKey="devices">
                <DevicesPage />
              </RoleGuard>
            }
          />

          <Route
            path="/alarms"
            element={
              <RoleGuard pageKey="alarms">
                <AlarmsPage />
              </RoleGuard>
            }
          />

          <Route
            path="/downtime"
            element={
              <RoleGuard pageKey="downtime">
                <DowntimePage />
              </RoleGuard>
            }
          />

          <Route
            path="/analytics"
            element={
              <RoleGuard pageKey="analytics">
                <AnalyticsPage />
              </RoleGuard>
            }
          />

          <Route
            path="/cameras"
            element={
              <RoleGuard pageKey="cameras">
                <CamerasPage />
              </RoleGuard>
            }
          />

          <Route
            path="/reports"
            element={
              <RoleGuard pageKey="reports">
                <ReportsPage />
              </RoleGuard>
            }
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}