import React from "react";
import { Box, Divider, Tooltip, Typography, Chip, Drawer } from "@mui/material";
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
const UI_TOPBAR_HEIGHT = 64;

const ALL_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: <DashboardIcon />, badge: "LIVE" },
  { key: "devices", label: "Stations & Devices", path: "/devices", icon: <PrecisionManufacturingIcon /> },
  { key: "alarms", label: "Live Alarms", path: "/alarms", icon: <NotificationsActiveIcon /> },
  { key: "downtime", label: "Downtime & Maintenance", path: "/downtime", icon: <BuildCircleIcon /> },
  { key: "analytics", label: "Analytics", path: "/analytics", icon: <AnalyticsIcon /> },
  { key: "cameras", label: "Cameras", path: "/cameras", icon: <VideocamIcon /> },
  { key: "reports", label: "Reports", path: "/reports", icon: <AssessmentRoundedIcon /> },
];

function canAccess(role, pageKey) {
  const allowed = PAGE_PERMISSIONS?.[pageKey] || [];
  return allowed.includes(role);
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
          gap: 1,
          px: 1.2,
        }}
      >
        {/* Logo framed */}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.14), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 10px 22px rgba(0,0,0,0.45), 0 0 0 1px rgba(120,90,255,0.10) inset",
            overflow: "hidden",
            flexShrink: 0,
            position: "relative",
            "@keyframes scan": {
              "0%": { transform: "translateY(-140%)" },
              "100%": { transform: "translateY(140%)" },
            },
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="FactorySphere Logo"
            sx={{ width: 26, height: 26, objectFit: "contain", position: "relative", zIndex: 1 }}
          />
          {/* scanline */}
          <Box
            sx={{
              position: "absolute",
              left: -20,
              right: -20,
              height: 22,
              top: 0,
              background: "linear-gradient(180deg, transparent, rgba(0,220,255,0.12), transparent)",
              animation: "scan 2.6s linear infinite",
              pointerEvents: "none",
            }}
          />
        </Box>

        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 900,
                color: "rgba(255,255,255,0.92)",
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                letterSpacing: 0.3,
              }}
            >
              FactorySphere
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.68)" }}>
              Industrial Command Center
            </Typography>
          </Box>
        )}

        <Box sx={{ flex: 1 }} />

        {!collapsed && (
          <Chip
            size="small"
            label="PHASE A"
            sx={{
              height: 22,
              fontWeight: 900,
              letterSpacing: 0.8,
              color: "rgba(255,255,255,0.92)",
              background: "linear-gradient(90deg, rgba(0,220,255,0.18), rgba(120,90,255,0.18))",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          />
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Navigation */}
      <Box sx={{ py: 1, px: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;

          return (
            <Tooltip
              key={item.path}
              title={item.label}
              placement="right"
              disableHoverListener={!collapsed}
            >
              <Box
                component={NavLink}
                to={item.path}
                onClick={() => onNavigateClose?.()}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.3,
                  px: 1.2,
                  py: 1.15,
                  borderRadius: 2.2,
                  textDecoration: "none",
                  mb: 0.8,
                  color: active ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.70)",
                  background: active
                    ? "linear-gradient(90deg, rgba(120,90,255,0.30), rgba(0,220,255,0.10))"
                    : "transparent",
                  border: active ? "1px solid rgba(120,90,255,0.22)" : "1px solid transparent",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.10)",
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                  },
                }}
              >
                {item.icon}

                {!collapsed && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                      {item.label}
                    </Typography>

                    {item.badge && (
                      <Chip
                        size="small"
                        label={item.badge}
                        sx={{
                          height: 20,
                          fontWeight: 900,
                          letterSpacing: 0.6,
                          color: "rgba(255,255,255,0.92)",
                          background:
                            "linear-gradient(90deg, rgba(0,220,255,0.22), rgba(120,90,255,0.22))",
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}

        {navItems.length === 0 && (
          <Box sx={{ px: 1, py: 2 }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.70)" }}>
              No pages available for this role.
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
        }}
      >
        <Typography variant="caption">{collapsed ? role : `Role: ${role}`}</Typography>
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

  // Desktop fixed sidebar
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
