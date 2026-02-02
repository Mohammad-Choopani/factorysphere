import React from "react";
import { Box, useMediaQuery } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const isDesktop = useMediaQuery("(min-width: 900px)");

  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    // On desktop keep drawer closed; collapse default can be false.
    if (isDesktop) setMobileOpen(false);
    // If you want default collapsed on mobile, it is handled by drawer not collapse.
  }, [isDesktop]);

  const handleHamburger = () => {
    if (isDesktop) {
      setIsCollapsed((v) => !v);
      return;
    }
    setMobileOpen((v) => !v);
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        isDesktop={isDesktop}
        isCollapsed={isCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
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
