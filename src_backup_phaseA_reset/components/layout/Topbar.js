import React from "react";
import { AppBar, Toolbar, Box, Typography, Button, Chip, IconButton, Tooltip } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useLocation, useNavigate } from "react-router-dom";

import logo from "../../assets/logo.png";

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
        "@keyframes ringSpin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "@keyframes glowPulse": {
          "0%": { opacity: 0.35 },
          "50%": { opacity: 0.7 },
          "100%": { opacity: 0.35 },
        },
      }}
    >
      {/* rotating ring */}
      <Box
        sx={{
          position: "absolute",
          inset: -10,
          borderRadius: "999px",
          border: "1px solid rgba(90,120,255,0.22)",
          animation: "ringSpin 10s linear infinite",
          pointerEvents: "none",
        }}
      />
      {/* glow */}
      <Box
        sx={{
          position: "absolute",
          inset: -20,
          background:
            "radial-gradient(circle at 50% 50%, rgba(90,120,255,0.22), transparent 60%)",
          filter: "blur(10px)",
          animation: "glowPulse 2.6s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

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

  const role = localStorage.getItem("role") || "UnknownRole";
  const email = localStorage.getItem("userEmail") || "unknown@local";

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
        background:
          "linear-gradient(180deg, rgba(10,12,20,0.82), rgba(10,12,20,0.62))",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2, minHeight: 64 }}>
        {/* Left: hamburger + brand */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
          <Tooltip
            title={
              isDesktop ? (isCollapsed ? "Expand sidebar" : "Collapse sidebar") : (mobileOpen ? "Close menu" : "Open menu")
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
              Industrial Command Center
            </Typography>
          </Box>
        </Box>

        {/* Right: role + user + logout */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip size="small" label={role} sx={{ fontWeight: 900 }} />

          <Typography
            variant="body2"
            sx={{
              display: { xs: "none", md: "block" },
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {email}
          </Typography>

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
        </Box>
      </Toolbar>
    </AppBar>
  );
}
