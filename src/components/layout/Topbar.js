// src/components/layout/Topbar.js
import React from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  useMediaQuery,
} from "@mui/material";

import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

function getShiftInfo(now = new Date()) {
  const h = now.getHours();
  const m = now.getMinutes();
  const minutes = h * 60 + m;

  if (minutes >= 360 && minutes < 840) return { key: "A", label: "Shift A" };
  if (minutes >= 840 && minutes < 1320) return { key: "B", label: "Shift B" };
  return { key: "C", label: "Shift C" };
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
        cursor: "pointer",
        userSelect: "none",
        transition: "transform 160ms ease, box-shadow 160ms ease, filter 160ms ease",
        "&:hover": {
          transform: "translateY(-1px) scale(1.03)",
          boxShadow: "0 18px 55px rgba(0,0,0,0.50), 0 0 0 3px rgba(124,92,255,0.18)",
          filter: "brightness(1.02)",
        },
        "&:active": { transform: "translateY(0px) scale(0.99)" },
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
          filter: "none",
        }}
      />
    </Box>
  );
}

export default function Topbar({ isDesktop, isCollapsed, mobileOpen, onHamburger }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isXs = useMediaQuery("(max-width: 520px)");

  const role = localStorage.getItem("role") || "UnknownRole";
  const email = localStorage.getItem("userEmail") || "unknown@local";
  const shift = getShiftInfo();

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("userEmail");
    navigate("/", { replace: true, state: { from: location.pathname } });
  };

  const showClose = !isDesktop && mobileOpen;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backdropFilter: "blur(14px)",
        background: "linear-gradient(180deg, rgba(10,12,20,0.82), rgba(10,12,20,0.62))",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 1.2, minHeight: 72 }}>
        {/* Left */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
          <Tooltip
            title={
              isDesktop
                ? isCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
                : mobileOpen
                ? "Close menu"
                : "Open menu"
            }
          >
            <IconButton
              onClick={onHamburger}
              aria-label={isDesktop ? "toggle sidebar" : "toggle menu"}
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.86)",
                "&:hover": {
                  borderColor: "rgba(140,180,255,0.35)",
                  boxShadow: "0 0 0 3px rgba(120,170,255,0.12)",
                },
              }}
            >
              {showClose ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
            </IconButton>
          </Tooltip>

          <BrandLogo size={isXs ? 40 : 44} />

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 950,
                letterSpacing: -0.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.05,
                fontSize: { xs: 18, sm: 20 },
              }}
            >
              FactorySphere
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: { xs: "none", sm: "block" },
                color: "rgba(255,255,255,0.62)",
              }}
            >
              Plant 3 • {shift.label}
            </Typography>
          </Box>
        </Box>

        {/* Right */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          {!isXs && <Chip size="small" label={role} sx={{ fontWeight: 900 }} />}
          <Chip size="small" label={shift.key} sx={{ fontWeight: 900 }} />

          <Typography
            variant="body2"
            sx={{
              display: { xs: "none", md: "block" },
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {email}
          </Typography>

          {isXs ? (
            <Tooltip title="Logout">
              <IconButton
                onClick={handleLogout}
                aria-label="logout"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                <LogoutRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              onClick={handleLogout}
              sx={{
                borderColor: "rgba(255,255,255,0.16)",
                color: "rgba(255,255,255,0.86)",
                "&:hover": { borderColor: "rgba(255,255,255,0.30)" },
              }}
            >
              Logout
            </Button>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
