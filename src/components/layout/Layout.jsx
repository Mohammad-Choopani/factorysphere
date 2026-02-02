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
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        isDesktop={isDesktop}
        isCollapsed={isCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          ml: { xs: 0, md: `${sidebarWidth}px` },
          transition: { md: "margin-left 220ms ease" },
        }}
      >
        <Topbar
          isDesktop={isDesktop}
          isCollapsed={isCollapsed}
          mobileOpen={mobileOpen}
          onHamburger={handleHamburger}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
