// src/components/layout/Layout.jsx
import React from "react";
import { Box, useMediaQuery } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// Must match Sidebar constants
const UI_SIDEBAR_COLLAPSED = 76;
const UI_SIDEBAR_EXPANDED = 268;

export default function Layout() {
  const isDesktop = useMediaQuery("(min-width: 900px)");

  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  const handleHamburger = () => {
    if (isDesktop) {
      setIsCollapsed((v) => !v);
      return;
    }
    setMobileOpen((v) => !v);
  };

  const closeMobile = () => setMobileOpen(false);

  const sidebarWidth = isDesktop ? (isCollapsed ? UI_SIDEBAR_COLLAPSED : UI_SIDEBAR_EXPANDED) : 0;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Sidebar isDesktop={isDesktop} isCollapsed={isCollapsed} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />

      {/* App shell */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          overflow: "hidden",

          // Keep sizing stable when sidebar toggles
          pl: { xs: 0, md: `${sidebarWidth}px` },
          transition: { md: "padding-left 220ms ease" },
        }}
      >
        {/* Topbar */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <Topbar isDesktop={isDesktop} isCollapsed={isCollapsed} mobileOpen={mobileOpen} onHamburger={handleHamburger} />
        </Box>

        {/* Scroll container */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",

            // ✅ Do NOT center content in an app shell
            // ✅ Let pages use full available width
            display: "block",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "none",
              mx: 0,

              // unified app padding (page-level can still add its own)
              px: { xs: 1, sm: 2, md: 2.5 },
              py: { xs: 1, sm: 1.5, md: 2 },
              pb: "var(--safe-bottom)",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
