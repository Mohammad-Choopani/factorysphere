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
import useAuth from "../../auth/useAuth";

function getShiftInfo(now = new Date()) {
  const h = now.getHours();
  const m = now.getMinutes();
  const minutes = h * 60 + m;

  if (minutes >= 360 && minutes < 840) return { key: "A", label: "Shift A" };
  if (minutes >= 840 && minutes < 1320) return { key: "B", label: "Shift B" };
  return { key: "C", label: "Shift C" };
}

function BrandLogo() {
  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.14)",
        background:
          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.14), rgba(255,255,255,0.02))",
        boxShadow:
          "0 16px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(120,90,255,0.10) inset",
      }}
    >
      <Box
        component="img"
        src={logo}
        alt="FactorySphere Logo"
        sx={{
          width: 26,
          height: 26,
          objectFit: "contain",
          position: "relative",
          zIndex: 1,
          filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.35))",
        }}
      />
    </Box>
  );
}

export default function Topbar({ isDesktop, isCollapsed, mobileOpen, onHamburger }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isXs = useMediaQuery("(max-width: 520px)");

  const { role, email, logout } = useAuth();
  const shift = getShiftInfo();

  const handleLogout = () => {
    logout();
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
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 1.2, minHeight: 64 }}>
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
                width: 44,
                height: 44,
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

          <BrandLogo />

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 950,
                letterSpacing: -0.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.05,
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
          {!isXs && <Chip size="small" label={role || "UnknownRole"} sx={{ fontWeight: 900 }} />}
          <Chip size="small" label={shift.key} sx={{ fontWeight: 900 }} />

          <Typography
            variant="body2"
            sx={{
              display: { xs: "none", md: "block" },
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {email || "unknown@local"}
          </Typography>

          {isXs ? (
            <Tooltip title="Logout">
              <IconButton
                onClick={handleLogout}
                aria-label="logout"
                sx={{
                  width: 44,
                  height: 44,
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
