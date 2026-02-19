// src/components/layout/Sidebar.js
import React from "react";
import { Box, Divider, Tooltip, Typography, Chip, Drawer, Stack } from "@mui/material";
import { NavLink, useLocation } from "react-router-dom";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import VideocamIcon from "@mui/icons-material/Videocam";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";

import logo from "../../assets/logo.png";
import { PAGE_PERMISSIONS } from "../../utils/permissions";

// UI constants (must match Layout.jsx)
const UI_SIDEBAR_COLLAPSED = 76;
const UI_SIDEBAR_EXPANDED = 268;

// ✅ Must match Topbar minHeight on desktop/mobile range
const UI_TOPBAR_HEIGHT = 72;

const ALL_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: <DashboardIcon fontSize="small" />, badge: "LIVE" },
  { key: "devices", label: "Stations & Devices", path: "/devices", icon: <PrecisionManufacturingIcon fontSize="small" /> },
  { key: "alarms", label: "Live Alarms", path: "/alarms", icon: <NotificationsActiveIcon fontSize="small" /> },
  { key: "downtime", label: "Downtime & Maintenance", path: "/downtime", icon: <BuildCircleIcon fontSize="small" /> },
  { key: "analytics", label: "Analytics", path: "/analytics", icon: <AnalyticsIcon fontSize="small" /> },
  { key: "cameras", label: "Cameras", path: "/cameras", icon: <VideocamIcon fontSize="small" /> },
  { key: "reports", label: "Reports", path: "/reports", icon: <AssessmentRoundedIcon fontSize="small" /> },
];

function canAccess(role, pageKey) {
  const allowed = PAGE_PERMISSIONS?.[pageKey] || [];
  return allowed.includes(role);
}

function LiveBadge() {
  return (
    <Tooltip title="Phase A: Mock Live (no real-time yet)" placement="top" arrow>
      <Chip
        size="small"
        label="LIVE"
        sx={{
          height: 20,
          flexShrink: 0,
          fontWeight: 900,
          letterSpacing: 0.6,
          color: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(90deg, rgba(0,220,255,0.22), rgba(120,90,255,0.22))",
          position: "relative",
          cursor: "default",
          userSelect: "none",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: -6,
            borderRadius: 999,
            border: "1px solid rgba(0,220,255,0.20)",
            opacity: 0.55,
            animation: "livePulse 1.8s ease-in-out infinite",
          },
          "@keyframes livePulse": {
            "0%": { transform: "scale(0.98)", opacity: 0.25 },
            "50%": { transform: "scale(1.06)", opacity: 0.55 },
            "100%": { transform: "scale(0.98)", opacity: 0.25 },
          },
        }}
      />
    </Tooltip>
  );
}

function BrandLogo({ size = 44 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "#ffffff",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 14px 40px rgba(0,0,0,0.40)",
        userSelect: "none",
      }}
      aria-label="brand"
    >
      <Box
        component="img"
        src={logo}
        alt="FactorySphere Logo"
        sx={{
          width: "70%",
          height: "70%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </Box>
  );
}

function SidebarContent({ collapsed, onNavigateClose }) {
  const location = useLocation();
  const role = localStorage.getItem("role") || "—";

  const width = collapsed ? UI_SIDEBAR_COLLAPSED : UI_SIDEBAR_EXPANDED;

  const navItems = React.useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => canAccess(role, item.key));
  }, [role]);

  return (
    <Box
      sx={{
        width,
        height: "100%",
        background:
          "radial-gradient(1200px 800px at 10% 10%, rgba(90,120,255,0.16), transparent 60%)," +
          "radial-gradient(1000px 700px at 90% 0%, rgba(0,220,255,0.14), transparent 55%)," +
          "linear-gradient(180deg, rgba(8,10,18,0.92), rgba(6,8,14,0.78))",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          height: UI_TOPBAR_HEIGHT,
          display: "flex",
          alignItems: "center",
          px: 1.25,
          gap: 1,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <BrandLogo size={44} />

        {!collapsed && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.92)",
                  lineHeight: 1.05,
                  letterSpacing: 0.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                FactorySphere
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.68)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                Control Center UI
              </Typography>
            </Box>

            <Chip
              size="small"
              label="PHASE A"
              sx={{
                flexShrink: 0,
                height: 22,
                fontWeight: 900,
                letterSpacing: 0.7,
                color: "rgba(255,255,255,0.92)",
                background: "linear-gradient(90deg, rgba(0,220,255,0.18), rgba(120,90,255,0.18))",
                border: "1px solid rgba(255,255,255,0.10)",
                whiteSpace: "nowrap",
                display: { xs: "none", sm: "inline-flex" },
              }}
            />
          </Stack>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Navigation */}
      <Box sx={{ py: 1, px: 1, overflowX: "hidden" }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;

          return (
            <Tooltip key={item.path} title={collapsed ? item.label : ""} placement="right" disableHoverListener={!collapsed}>
              <Box
                component={NavLink}
                to={item.path}
                onClick={() => onNavigateClose?.()}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  px: 1.1,
                  py: 1.05,
                  borderRadius: 2.2,
                  textDecoration: "none",
                  mb: 0.8,
                  minWidth: 0,
                  maxWidth: "100%",
                  overflow: "hidden",
                  color: active ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.70)",
                  background: active
                    ? "linear-gradient(90deg, rgba(120,90,255,0.30), rgba(0,220,255,0.10))"
                    : "transparent",
                  border: active ? "1px solid rgba(120,90,255,0.22)" : "1px solid transparent",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.10)",
                    background: "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                  },
                }}
              >
                {item.icon}

                {!collapsed && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      minWidth: 0,
                      flex: 1,
                      overflow: "hidden",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 850,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </Typography>

                    {item.badge === "LIVE" ? <LiveBadge /> : null}
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}

        {navItems.length === 0 && !collapsed && (
          <Box sx={{ px: 1, py: 2 }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.70)", fontWeight: 700 }}>
              No modules assigned
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.62)" }}>
              Select a Phase A management role on Login.
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* Footer */}
      <Box
        sx={{
          px: 1.4,
          py: 1.2,
          color: "rgba(255,255,255,0.60)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {collapsed ? role : `Role: ${role}`}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Sidebar({ isDesktop, isCollapsed, mobileOpen, onCloseMobile }) {
  const collapsed = isDesktop ? isCollapsed : false;

  if (!isDesktop) {
    return (
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: UI_SIDEBAR_EXPANDED,
            border: "none",
            background: "transparent",
            overflow: "hidden",
          },
        }}
        sx={{
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
          },
        }}
      >
        <SidebarContent collapsed={false} onNavigateClose={onCloseMobile} />
      </Drawer>
    );
  }

  const width = collapsed ? UI_SIDEBAR_COLLAPSED : UI_SIDEBAR_EXPANDED;

  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        top: 0,
        width,
        height: "100vh",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: "width 220ms ease",
      }}
    >
      <SidebarContent collapsed={collapsed} />
    </Box>
  );
}
