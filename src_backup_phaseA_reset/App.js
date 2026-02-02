// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/layout/Layout";
import DashboardPage from "./pages/DashboardPage";
import DevicesPage from "./pages/DevicesPage";
import LoginPage from "./pages/LoginPage";

import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/useAuth";

function SmartRedirect() {
  const auth = useAuth();
  return <Navigate to={auth ? "/dashboard" : "/login"} replace />;
}

function PublicOnly({ children }) {
  const auth = useAuth();
  if (auth) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SmartRedirect />} />

        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="*" element={<SmartRedirect />} />
          </Route>
        </Route>

        <Route path="*" element={<SmartRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
