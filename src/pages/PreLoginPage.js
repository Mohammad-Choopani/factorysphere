import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Drawer,
  Switch,
  FormControlLabel,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import WindowRoundedIcon from "@mui/icons-material/WindowRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import FactoryRoundedIcon from "@mui/icons-material/FactoryRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";

import logo from "../assets/logo.png";

function formatTime(d) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatDateShort(d) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function TaskIcon({ title, onClick, children, active, size = 40 }) {
  return (
    <Tooltip title={title} arrow placement="top">
      <IconButton
        onClick={onClick}
        sx={{
          width: size,
          height: size,
          borderRadius: 2.2,
          color: "rgba(255,255,255,0.92)",
          background: active ? "rgba(255,255,255,0.10)" : "transparent",
          border: active ? "1px solid rgba(180,220,255,0.20)" : "1px solid transparent",
          transition: "background .12s ease, transform .12s ease, border-color .12s ease",
          "&:hover": { background: "rgba(255,255,255,0.10)" },
          "&:active": { transform: "scale(0.98)" },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

const glassPaperSx = {
  borderRadius: 3,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(10, 14, 24, 0.42)",
  backdropFilter: "blur(26px) saturate(160%)",
  WebkitBackdropFilter: "blur(26px) saturate(160%)",
  boxShadow: "0 18px 70px rgba(0,0,0,0.60)",
  overflow: "hidden",
};

function GlassHeaderLine() {
  return (
    <>
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03) 40%, transparent 70%)",
          opacity: 0.6,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, transparent, rgba(140,220,255,0.28), transparent)",
          opacity: 0.95,
        }}
      />
    </>
  );
}

function BottomSheet({ open, onClose, title, icon, children }) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(10, 14, 24, 0.55)",
          backdropFilter: "blur(26px) saturate(160%)",
          WebkitBackdropFilter: "blur(26px) saturate(160%)",
          boxShadow: "0 -18px 70px rgba(0,0,0,0.65)",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ position: "relative", p: 1.6 }}>
        <GlassHeaderLine />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            {icon}
            <Typography sx={{ fontWeight: 1000, letterSpacing: 0.4 }}>{title}</Typography>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.80)" }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />
      <Box sx={{ p: 1.6, pt: 1.2 }}>{children}</Box>
      <Box sx={{ height: 12 }} />
    </Drawer>
  );
}

export default function PreLoginPage() {
  const navigate = useNavigate();
  const [now, setNow] = React.useState(() => new Date());

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Desktop anchors (only these exist; no moreAnchor)
  const [startAnchor, setStartAnchor] = React.useState(null);
  const [networkAnchor, setNetworkAnchor] = React.useState(null);
  const [langAnchor, setLangAnchor] = React.useState(null);
  const [clockAnchor, setClockAnchor] = React.useState(null);

  // Global panels
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [powerOpen, setPowerOpen] = React.useState(false);

  // Mobile sheets
  const [startSheet, setStartSheet] = React.useState(false);
  const [networkSheet, setNetworkSheet] = React.useState(false);
  const [langSheet, setLangSheet] = React.useState(false);
  const [clockSheet, setClockSheet] = React.useState(false);
  const [traySheet, setTraySheet] = React.useState(false);

  // Mock system state
  const [demoMode, setDemoMode] = React.useState(true);
  const [soundFx, setSoundFx] = React.useState(false);
  const [language, setLanguage] = React.useState("EN");
  const [apiBase] = React.useState("http://localhost:4000");
  const [networkStatus] = React.useState("ONLINE");
  const [vpnStatus] = React.useState("OFF");

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const goLogin = () => navigate("/login", { replace: false });

  const closeAll = React.useCallback(() => {
    setStartAnchor(null);
    setNetworkAnchor(null);
    setLangAnchor(null);
    setClockAnchor(null);

    setSearchOpen(false);
    setSettingsOpen(false);
    setPowerOpen(false);

    setStartSheet(false);
    setNetworkSheet(false);
    setLangSheet(false);
    setClockSheet(false);
    setTraySheet(false);
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeAll();
      if (!isMobile && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        closeAll();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAll, isMobile]);

  const isStartOpen = Boolean(startAnchor);
  const isNetworkOpen = Boolean(networkAnchor);
  const isLangOpen = Boolean(langAnchor);
  const isClockOpen = Boolean(clockAnchor);

  const taskbarHeight = isMobile ? 58 : 54;
  const iconSize = isMobile ? 38 : 40;

  const TaskbarTime = (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        if (isMobile) setClockSheet(true);
        else setClockAnchor(isClockOpen ? null : e.currentTarget);
      }}
      sx={{
        ml: 0.6,
        px: 1.1,
        py: 0.55,
        borderRadius: 2.2,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        cursor: "pointer",
        textAlign: "right",
        minWidth: isMobile ? 104 : 116,
        transition: "background .12s ease",
        "&:hover": { background: "rgba(255,255,255,0.06)" },
      }}
    >
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 900,
          letterSpacing: 0.4,
          color: "rgba(255,255,255,0.90)",
          lineHeight: 1.1,
        }}
      >
        {formatTime(now)}
      </Typography>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 800,
          color: "rgba(255,255,255,0.60)",
          lineHeight: 1.1,
        }}
      >
        {formatDateShort(now)}
      </Typography>
    </Box>
  );

  const StartMenuContent = (
    <>
      <List dense disablePadding>
        <ListItemButton
          onClick={() => {
            closeAll();
            goLogin();
          }}
          sx={{ borderRadius: 2 }}
        >
          <ListItemText
            primary="Login"
            secondary="Open authentication form"
            primaryTypographyProps={{ fontWeight: 900 }}
            secondaryTypographyProps={{ color: "rgba(255,255,255,0.55)" }}
          />
          <ChevronRightRoundedIcon sx={{ color: "rgba(255,255,255,0.55)" }} />
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            closeAll();
            setSearchOpen(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          <ListItemText
            primary="Search"
            secondary={isMobile ? "Find commands (mock)" : "Find commands (Ctrl+K)"}
            primaryTypographyProps={{ fontWeight: 900 }}
            secondaryTypographyProps={{ color: "rgba(255,255,255,0.55)" }}
          />
          <ChevronRightRoundedIcon sx={{ color: "rgba(255,255,255,0.55)" }} />
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            closeAll();
            setSettingsOpen(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          <ListItemText
            primary="Settings"
            secondary="Open control center settings"
            primaryTypographyProps={{ fontWeight: 900 }}
            secondaryTypographyProps={{ color: "rgba(255,255,255,0.55)" }}
          />
          <ChevronRightRoundedIcon sx={{ color: "rgba(255,255,255,0.55)" }} />
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            closeAll();
            setPowerOpen(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          <ListItemText
            primary="Power"
            secondary="Exit / restart (mock)"
            primaryTypographyProps={{ fontWeight: 900 }}
            secondaryTypographyProps={{ color: "rgba(255,255,255,0.55)" }}
          />
          <ChevronRightRoundedIcon sx={{ color: "rgba(255,255,255,0.55)" }} />
        </ListItemButton>
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", my: 1.2 }} />

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Chip
          size="small"
          label={`API: ${apiBase}`}
          sx={{
            bgcolor: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />
        <Chip
          size="small"
          label={networkStatus}
          sx={{
            bgcolor: networkStatus === "ONLINE" ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.16)",
            color: "rgba(255,255,255,0.86)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontWeight: 900,
          }}
        />
      </Stack>
    </>
  );

  const NetworkContent = (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ color: "rgba(255,255,255,0.60)", fontWeight: 800 }}>Status</Typography>
        <Chip
          size="small"
          label={networkStatus}
          sx={{
            bgcolor: networkStatus === "ONLINE" ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.16)",
            color: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontWeight: 900,
          }}
        />
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ color: "rgba(255,255,255,0.60)", fontWeight: 800 }}>VPN</Typography>
        <Chip
          size="small"
          label={vpnStatus}
          sx={{
            bgcolor: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontWeight: 900,
          }}
        />
      </Stack>

      <Stack spacing={0.5}>
        <Typography sx={{ color: "rgba(255,255,255,0.60)", fontWeight: 800 }}>API Base</Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.82)", fontWeight: 850 }}>{apiBase}</Typography>
      </Stack>
    </Stack>
  );

  const LanguageContent = (
    <List dense disablePadding>
      {["EN", "FA"].map((l) => (
        <ListItemButton
          key={l}
          selected={language === l}
          onClick={() => setLanguage(l)}
          sx={{
            borderRadius: 2,
            "&.Mui-selected": {
              bgcolor: "rgba(140,220,255,0.12)",
              border: "1px solid rgba(140,220,255,0.18)",
            },
          }}
        >
          <ListItemText
            primary={l === "EN" ? "English" : "French"}
            
            primaryTypographyProps={{ fontWeight: 900 }}
            secondaryTypographyProps={{ color: "rgba(255,255,255,0.55)" }}
          />
        </ListItemButton>
      ))}
    </List>
  );

  const ClockContent = (
    <>
      <Typography sx={{ fontSize: 30, fontWeight: 950, letterSpacing: 0.6 }}>
        {formatTime(now)}
      </Typography>
      <Typography sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 850 }}>
        {formatDateShort(now)}
      </Typography>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", my: 1.2 }} />

      <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 900 }}>
        Shift Schedule (Plant 3)
      </Typography>

      <Stack spacing={0.8} sx={{ mt: 0.8 }}>
        {[
          "Shift A • 06:00–14:00",
          "Shift B • 14:00–22:00",
          "Shift C • 22:00–06:00",
        ].map((t) => (
          <Chip
            key={t}
            size="small"
            icon={<ChevronRightRoundedIcon />}
            label={t}
            sx={{
              justifyContent: "flex-start",
              bgcolor: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.80)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </Stack>
    </>
  );

  const TrayContent = (
    <Stack spacing={1}>
      <Button
        variant="outlined"
        startIcon={<WifiRoundedIcon />}
        onClick={() => {
          setTraySheet(false);
          setNetworkSheet(true);
        }}
        sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}
      >
        Network
      </Button>

      <Button
        variant="outlined"
        startIcon={<LanguageRoundedIcon />}
        onClick={() => {
          setTraySheet(false);
          setLangSheet(true);
        }}
        sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}
      >
        Language
      </Button>

      <Button
        variant="outlined"
        startIcon={<SettingsRoundedIcon />}
        onClick={() => {
          setTraySheet(false);
          setSettingsOpen(true);
        }}
        sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}
      >
        Settings
      </Button>

      <Button
        variant="outlined"
        startIcon={<AccessTimeRoundedIcon />}
        onClick={() => {
          setTraySheet(false);
          setClockSheet(true);
        }}
        sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}
      >
        Time & Shifts
      </Button>
    </Stack>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        background:
          "radial-gradient(1200px 720px at 12% 16%, rgba(124,92,255,0.18), transparent 60%)," +
          "radial-gradient(980px 680px at 88% 20%, rgba(0,220,255,0.14), transparent 55%)," +
          "linear-gradient(180deg, #040512 0%, #070A12 50%, #05081A 100%)",
      }}
    >
      {/* CAD grid */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.10,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "110px 110px",
          maskImage:
            "radial-gradient(closest-side at 50% 40%, rgba(0,0,0,1), rgba(0,0,0,0))",
          WebkitMaskImage:
            "radial-gradient(closest-side at 50% 40%, rgba(0,0,0,1), rgba(0,0,0,0))",
        }}
      />

      {/* Vignette */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(900px 600px at 50% 40%, transparent 30%, rgba(0,0,0,0.65) 100%)",
          opacity: 0.9,
        }}
      />

      {/* Brand */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          zIndex: 2,
          px: 2,
          pb: 10,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gap: 2.2,
            justifyItems: "center",
            transform: { xs: "translateY(-34px)", sm: "translateY(-60px)" },
          }}
        >
          <Box
            sx={{
              width: { xs: 110, sm: 140, md: 160 },
              height: { xs: 110, sm: 140, md: 160 },
              borderRadius: "50%",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.65), 0 0 40px rgba(140,220,255,0.12)",
            }}
          >
            <Box
              component="img"
              src={logo}
              alt="Plasman"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </Box>

          <Typography
            sx={{
              fontWeight: 1000,
              letterSpacing: { xs: 6, sm: 8 },
              textTransform: "uppercase",
              fontSize: { xs: 44, sm: 68, md: 80 },
              lineHeight: 0.9,
              color: "rgba(255,255,255,0.94)",
              textShadow:
                "0 30px 90px rgba(0,0,0,0.75), 0 0 25px rgba(140,220,255,0.08)",
            }}
          >
            PLASMAN
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 800,
              letterSpacing: { xs: 1.2, sm: 1.6 },
              color: "rgba(255,255,255,0.55)",
              textTransform: "uppercase",
            }}
          >
            FactorySphere • Industrial Control Center
          </Typography>

          <Typography
            sx={{
              mt: 0.6,
              fontSize: 12,
              fontWeight: 750,
              letterSpacing: 0.8,
              color: "rgba(255,255,255,0.42)",
              textTransform: "uppercase",
            }}
          >
            
          </Typography>
        </Box>
      </Box>

      {/* Taskbar */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          px: { xs: 0.9, sm: 1.2 },
          pb: { xs: 0.8, sm: 1.0 },
        }}
      >
        <Box
          sx={{
            mx: "auto",
            width: "min(1200px, 100%)",
            height: taskbarHeight,
            borderRadius: 3.2,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(10, 14, 24, 0.34)",
            backdropFilter: "blur(28px) saturate(170%)",
            WebkitBackdropFilter: "blur(28px) saturate(170%)",
            boxShadow: "0 18px 70px rgba(0,0,0,0.60)",
            display: "grid",
            gridTemplateColumns: isMobile ? "auto 1fr auto" : "1fr auto 1fr",
            alignItems: "center",
            px: { xs: 0.7, sm: 1.2 },
            position: "relative",
            overflow: "hidden",
          }}
        >
          <GlassHeaderLine />

          {/* Left */}
          <Stack direction="row" spacing={0.2} alignItems="center">
            <TaskIcon
              title="Start"
              active={isMobile ? startSheet : isStartOpen}
              size={iconSize}
              onClick={(e) => {
                if (isMobile) setStartSheet(true);
                else setStartAnchor(isStartOpen ? null : e.currentTarget);
              }}
            >
              <WindowRoundedIcon fontSize="small" />
            </TaskIcon>

            <TaskIcon
              title={isMobile ? "Search" : "Search (Ctrl+K)"}
              active={searchOpen}
              size={iconSize}
              onClick={() => {
                closeAll();
                setSearchOpen(true);
              }}
            >
              <SearchRoundedIcon fontSize="small" />
            </TaskIcon>

            <TaskIcon
              title="Login"
              size={iconSize}
              onClick={() => {
                closeAll();
                goLogin();
              }}
            >
              <LoginRoundedIcon fontSize="small" />
            </TaskIcon>

            {!isMobile && (
              <TaskIcon
                title="Power"
                active={powerOpen}
                size={iconSize}
                onClick={() => {
                  closeAll();
                  setPowerOpen(true);
                }}
              >
                <PowerSettingsNewRoundedIcon fontSize="small" />
              </TaskIcon>
            )}
          </Stack>

          {/* Center */}
          {!isMobile ? (
            <Stack direction="row" spacing={0.6} alignItems="center" justifyContent="center">
              <Chip
                size="small"
                label={demoMode ? "DEMO" : "LIVE"}
                sx={{
                  height: 24,
                  fontWeight: 900,
                  letterSpacing: 0.8,
                  bgcolor: demoMode ? "rgba(56,189,248,0.18)" : "rgba(34,197,94,0.18)",
                  color: "rgba(255,255,255,0.88)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              />
              <Chip
                size="small"
                label="Plant 3 • Windsor"
                sx={{
                  height: 24,
                  fontWeight: 800,
                  bgcolor: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.80)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </Stack>
          ) : (
            <Box />
          )}

          {/* Right tray */}
          <Stack direction="row" spacing={0.2} alignItems="center" justifyContent="flex-end">
            {isMobile ? (
              <>
                <TaskIcon
                  title="System Tray"
                  active={traySheet}
                  size={iconSize}
                  onClick={() => {
                    closeAll();
                    setTraySheet(true);
                  }}
                >
                  <MoreHorizRoundedIcon fontSize="small" />
                </TaskIcon>
                {TaskbarTime}
              </>
            ) : (
              <>
                <TaskIcon
                  title="Network"
                  active={isNetworkOpen}
                  size={iconSize}
                  onClick={(e) => setNetworkAnchor(isNetworkOpen ? null : e.currentTarget)}
                >
                  <WifiRoundedIcon fontSize="small" />
                </TaskIcon>

                <TaskIcon
                  title="Language"
                  active={isLangOpen}
                  size={iconSize}
                  onClick={(e) => setLangAnchor(isLangOpen ? null : e.currentTarget)}
                >
                  <LanguageRoundedIcon fontSize="small" />
                </TaskIcon>

                <TaskIcon
                  title="Settings"
                  active={settingsOpen}
                  size={iconSize}
                  onClick={() => {
                    closeAll();
                    setSettingsOpen(true);
                  }}
                >
                  <SettingsRoundedIcon fontSize="small" />
                </TaskIcon>

                {TaskbarTime}
              </>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Desktop popovers */}
      <Popover
        open={!isMobile && Boolean(startAnchor)}
        anchorEl={startAnchor}
        onClose={() => setStartAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ sx: { ...glassPaperSx, width: 360, mt: -1.2, position: "relative" } }}
      >
        <Box sx={{ position: "relative", p: 1.4 }}>
          <GlassHeaderLine />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FactoryRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />
              <Typography sx={{ fontWeight: 950, letterSpacing: 0.6 }}>Control Menu</Typography>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setStartAnchor(null)}
              sx={{ color: "rgba(255,255,255,0.75)" }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", mb: 1 }} />
          {StartMenuContent}
        </Box>
      </Popover>

      <Popover
        open={!isMobile && Boolean(networkAnchor)}
        anchorEl={networkAnchor}
        onClose={() => setNetworkAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{ sx: { ...glassPaperSx, width: 320, mt: -1.2, position: "relative" } }}
      >
        <Box sx={{ position: "relative", p: 1.4 }}>
          <GlassHeaderLine />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <WifiRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />
            <Typography sx={{ fontWeight: 950, letterSpacing: 0.4 }}>Network</Typography>
          </Stack>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", mb: 1 }} />
          {NetworkContent}
        </Box>
      </Popover>

      <Popover
        open={!isMobile && Boolean(langAnchor)}
        anchorEl={langAnchor}
        onClose={() => setLangAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{ sx: { ...glassPaperSx, width: 260, mt: -1.2, position: "relative" } }}
      >
        <Box sx={{ position: "relative", p: 1.4 }}>
          <GlassHeaderLine />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <LanguageRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />
            <Typography sx={{ fontWeight: 950, letterSpacing: 0.4 }}>Language</Typography>
          </Stack>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", mb: 1 }} />
          {LanguageContent}
        </Box>
      </Popover>

      <Popover
        open={!isMobile && Boolean(clockAnchor)}
        anchorEl={clockAnchor}
        onClose={() => setClockAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{ sx: { ...glassPaperSx, width: 320, mt: -1.2, position: "relative" } }}
      >
        <Box sx={{ position: "relative", p: 1.4 }}>
          <GlassHeaderLine />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AccessTimeRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />
            <Typography sx={{ fontWeight: 950, letterSpacing: 0.4 }}>Time & Shifts</Typography>
          </Stack>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", mb: 1 }} />
          {ClockContent}
        </Box>
      </Popover>

      {/* Mobile bottom sheets */}
      <BottomSheet
        open={startSheet}
        onClose={() => setStartSheet(false)}
        title="Control Menu"
        icon={<FactoryRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />}
      >
        {StartMenuContent}
      </BottomSheet>

      <BottomSheet
        open={networkSheet}
        onClose={() => setNetworkSheet(false)}
        title="Network"
        icon={<WifiRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />}
      >
        {NetworkContent}
      </BottomSheet>

      <BottomSheet
        open={langSheet}
        onClose={() => setLangSheet(false)}
        title="Language"
        icon={<LanguageRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />}
      >
        {LanguageContent}
      </BottomSheet>

      <BottomSheet
        open={clockSheet}
        onClose={() => setClockSheet(false)}
        title="Time & Shifts"
        icon={<AccessTimeRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />}
      >
        {ClockContent}
      </BottomSheet>

      <BottomSheet
        open={traySheet}
        onClose={() => setTraySheet(false)}
        title="System Tray"
        icon={<InfoOutlinedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />}
      >
        {TrayContent}
      </BottomSheet>

      {/* Search */}
      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            ...glassPaperSx,
            borderRadius: isMobile ? 0 : 3,
            position: "relative",
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <GlassHeaderLine />
          <DialogTitle sx={{ pb: 1, fontWeight: 950, letterSpacing: 0.4 }}>
            Search / Command Palette
          </DialogTitle>
          <DialogContent sx={{ pt: 0, pb: 2 }}>
            <TextField
              autoFocus
              fullWidth
              placeholder="Type a command (example: open dashboard, go devices, login)"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TerminalRoundedIcon sx={{ color: "rgba(255,255,255,0.70)" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-root": {
                  borderRadius: 2.2,
                  bgcolor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.90)",
                },
                "& input::placeholder": { color: "rgba(255,255,255,0.45)", opacity: 1 },
              }}
            />

            <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", my: 1.4 }} />

            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 800 }}>
              Suggested actions
            </Typography>

            <List dense>
              <ListItemButton
                sx={{ borderRadius: 2 }}
                onClick={() => {
                  closeAll();
                  goLogin();
                }}
              >
                <ListItemText
                  primary="Login"
                  secondary="Open the login form"
                  primaryTypographyProps={{ fontWeight: 900 }}
                  secondaryTypographyProps={{ color: "rgba(255,255,255,0.55)" }}
                />
              </ListItemButton>

              <ListItemButton
                sx={{ borderRadius: 2 }}
                onClick={() => {
                  setSearchOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <ListItemText
                  primary="Open Settings"
                  secondary="Control Center configuration"
                  primaryTypographyProps={{ fontWeight: 900 }}
                  secondaryTypographyProps={{ color: "rgba(255,255,255,0.55)" }}
                />
              </ListItemButton>

              <ListItemButton sx={{ borderRadius: 2 }} onClick={() => setSearchOpen(false)}>
                <ListItemText
                  primary="Close"
                  secondary="Dismiss this palette (Esc)"
                  primaryTypographyProps={{ fontWeight: 900 }}
                  secondaryTypographyProps={{ color: "rgba(255,255,255,0.55)" }}
                />
              </ListItemButton>
            </List>
          </DialogContent>
        </Box>
      </Dialog>

      {/* Settings drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420 },
            borderLeft: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(10, 14, 24, 0.45)",
            backdropFilter: "blur(26px) saturate(160%)",
            WebkitBackdropFilter: "blur(26px) saturate(160%)",
            boxShadow: "-20px 0 80px rgba(0,0,0,0.55)",
            color: "rgba(255,255,255,0.92)",
            position: "relative",
          },
        }}
      >
        <Box sx={{ position: "relative", p: 2 }}>
          <GlassHeaderLine />
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <SettingsRoundedIcon sx={{ color: "rgba(180,220,255,0.85)" }} />
              <Typography sx={{ fontWeight: 1000, letterSpacing: 0.6 }}>
                Control Center Settings
              </Typography>
            </Stack>
            <IconButton
              onClick={() => setSettingsOpen(false)}
              sx={{ color: "rgba(255,255,255,0.80)" }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          <Typography sx={{ mt: 0.6, color: "rgba(255,255,255,0.55)", fontWeight: 800 }}>
            Pre-login configuration (mock now, real later)
          </Typography>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", my: 2 }} />

          <Stack spacing={1.2}>
            <FormControlLabel
              control={<Switch checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />}
              label="Demo Mode"
            />
            <FormControlLabel
              control={<Switch checked={soundFx} onChange={(e) => setSoundFx(e.target.checked)} />}
              label="UI Sound FX"
            />

            <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

            <Stack spacing={0.8}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SecurityRoundedIcon sx={{ color: "rgba(255,255,255,0.70)" }} />
                <Typography sx={{ fontWeight: 950 }}>Security</Typography>
              </Stack>
              <Typography sx={{ color: "rgba(255,255,255,0.60)", fontWeight: 800 }}>
                Authentication is required to enter operational dashboards.
              </Typography>
              <Button
                variant="contained"
                onClick={goLogin}
                sx={{ mt: 0.5, borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}
              >
                Open Login
              </Button>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

            <Stack spacing={0.8}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InfoOutlinedIcon sx={{ color: "rgba(255,255,255,0.70)" }} />
                <Typography sx={{ fontWeight: 950 }}>System</Typography>
              </Stack>
              <Typography sx={{ color: "rgba(255,255,255,0.60)", fontWeight: 800 }}>
                API: {apiBase}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.60)", fontWeight: 800 }}>
                Network: {networkStatus} • VPN: {vpnStatus}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.60)", fontWeight: 800 }}>
                Language: {language}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Drawer>

      {/* Power dialog */}
      <Dialog
        open={powerOpen}
        onClose={() => setPowerOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            ...glassPaperSx,
            borderRadius: 3,
            position: "relative",
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <GlassHeaderLine />
          <DialogTitle sx={{ fontWeight: 1000, letterSpacing: 0.4 }}>
            Power Options (Mock)
          </DialogTitle>
          <DialogContent sx={{ pb: 2 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.60)", fontWeight: 800 }}>
              These actions are placeholders for the real control-room workflow.
            </Typography>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", my: 1.6 }} />

            <Stack spacing={1}>
              <Button
                variant="outlined"
                startIcon={<LoginRoundedIcon />}
                onClick={() => {
                  setPowerOpen(false);
                  goLogin();
                }}
                sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}
              >
                Go to Login
              </Button>

              <Button
                variant="outlined"
                startIcon={<FactoryRoundedIcon />}
                onClick={() => setPowerOpen(false)}
                sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}
              >
                Restart UI (Mock)
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<PowerSettingsNewRoundedIcon />}
                onClick={() => setPowerOpen(false)}
                sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 900 }}
              >
                Exit (Mock)
              </Button>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.10)", my: 1.6 }} />

            <Button onClick={() => setPowerOpen(false)} sx={{ textTransform: "none", fontWeight: 900 }}>
              Close
            </Button>
          </DialogContent>
        </Box>
      </Dialog>
    </Box>
  );
}