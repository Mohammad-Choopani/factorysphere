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

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/alarms" element={<AlarmsPage />} />
          <Route path="/downtime" element={<DowntimePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/cameras" element={<CamerasPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
