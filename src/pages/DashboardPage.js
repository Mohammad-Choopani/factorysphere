// src/pages/DashboardPage.js
import React from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Divider,
  Button,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import VideocamIcon from "@mui/icons-material/Videocam";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import PauseCircleFilledRoundedIcon from "@mui/icons-material/PauseCircleFilledRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import AlarmOnRoundedIcon from "@mui/icons-material/AlarmOnRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";

import { useNavigate } from "react-router-dom";
import { PAGE_PERMISSIONS } from "../utils/permissions";

/** ===== UI LOCKS ===== */
const UI = {
  rCard: 4,
  rInner: 3,
  padCard: { xs: 1.4, sm: 2 },
  gap: { xs: 1.1, sm: 2 },
};

function getShiftInfo(now = new Date()) {
  const h = now.getHours();
  const m = now.getMinutes();
  const minutes = h * 60 + m;

  if (minutes >= 360 && minutes < 840) return { key: "A", label: "Shift A", range: "06:00–14:00" };
  if (minutes >= 840 && minutes < 1320) return { key: "B", label: "Shift B", range: "14:00–22:00" };
  return { key: "C", label: "Shift C", range: "22:00–06:00" };
}

function canAccess(role, pageKey) {
  const allowed = PAGE_PERMISSIONS?.[pageKey] || [];
  return allowed.includes(role);
}

function EllipChip({ label, sx }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 22,
        fontWeight: 900,
        maxWidth: 140,
        borderRadius: 999,
        "& .MuiChip-label": {
          px: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
        ...sx,
      }}
    />
  );
}

/**
 * ✅ Fix for mobile “text/icon clipped by border”
 * MUI Grid spacing uses negative margins. Inside Paper with overflow:hidden => clipping.
 * This wrapper adds tiny horizontal inset ONLY on xs/sm to neutralize negative margins.
 */
function GridInset({ children, sx }) {
  return (
    <Box
      sx={{
        px: { xs: 0.9, sm: 0.35, md: 0 }, // tuned to cover spacing(1.2) negative margins on mobile
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Card shell */
function CardShell({ children, sx, onClick, role = "region" }) {
  return (
    <Paper
      role={role}
      onClick={onClick}
      sx={{
        p: UI.padCard,
        borderRadius: UI.rCard,
        height: "100%",
        position: "relative",

        // ✅ FIX #1: avoid clipping on mobile
        overflow: { xs: "visible", md: "hidden" },

        boxSizing: "border-box",
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "transform .16s ease, border-color .16s ease, background .16s ease",
        ...(onClick
          ? {
              cursor: "pointer",
              "&:hover": {
                transform: { xs: "none", md: "translateY(-1px)" },
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.035)",
              },
              "&:active": { transform: "translateY(0px) scale(0.995)" },
            }
          : null),
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

/** Section header */
function SectionHeader({ icon, title, rightChip }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
  gap: 1.2,
  minWidth: 0,
  pb: 0.75,

  // extra safe inset from border on mobile
  px: { xs: 0.7, sm: 0 },
  pt: { xs: 0.2, sm: 0 },
}}

    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: UI.rInner,
            display: "grid",
            placeItems: "center",
            background: "rgba(124,92,255,0.12)",
            border: "1px solid rgba(124,92,255,0.22)",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>

        <Typography
          sx={{
            fontWeight: 950,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
            pt: "1px",
          }}
        >
          {title}
        </Typography>
      </Stack>

      {rightChip ? <EllipChip label={rightChip} sx={{ flexShrink: 0 }} /> : null}
    </Stack>
  );
}

/** Small stat pill */
function StatPill({ icon, label, value, sx }) {
  return (
    <Paper
      sx={{
        p: 1.15,
        borderRadius: UI.rInner,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 1.2,
        overflow: "hidden",
        minHeight: 64,
        height: "100%",
        transition: "transform .14s ease, border-color .14s ease, background .14s ease",
        "&:hover": {
          transform: { xs: "none", md: "translateY(-1px)" },
          borderColor: "rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
        },
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: UI.rInner,
          display: "grid",
          placeItems: "center",
          background: "rgba(124,92,255,0.12)",
          border: "1px solid rgba(124,92,255,0.22)",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            fontWeight: 900,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontWeight: 950,
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

function ModuleRow({ icon, title, subtitle, badge, onClick }) {
  return (
    <CardShell
      onClick={onClick}
      role="button"
      sx={{
        p: 1.25,
        borderRadius: UI.rInner,
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        alignItems: "center",
        gap: 1.2,
        minHeight: 74,
        "&:hover": {
          transform: { xs: "none", md: "translateY(-1px)" },
          borderColor: "rgba(124,92,255,0.28)",
          background: "rgba(124,92,255,0.05)",
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: UI.rInner,
          display: "grid",
          placeItems: "center",
          background: "rgba(124,92,255,0.14)",
          border: "1px solid rgba(124,92,255,0.22)",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 900,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.15,
              minWidth: 0,
              flex: 1,
            }}
          >
            {title}
          </Typography>

          {badge ? <EllipChip label={badge} sx={{ maxWidth: 90, flexShrink: 0 }} /> : null}
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtitle}
        </Typography>
      </Box>

      <ArrowForwardRoundedIcon style={{ opacity: 0.65, flexShrink: 0 }} />
    </CardShell>
  );
}

function SimpleList({ title, rows, rightBadge, icon, minRows = 5 }) {
  const padCount = Math.max(0, minRows - rows.length);

  return (
    <CardShell
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: 260,
      }}
    >
      <SectionHeader icon={icon} title={title} rightChip={rightBadge} />
      <Divider sx={{ mt: 1.35, mb: 1.35 }} />

      <Box sx={{ display: "grid", gap: 1, flex: 1, minHeight: 0 }}>
        {rows.map((r) => (
          <Paper
            key={r.id}
            sx={{
              p: 1.05,
              borderRadius: UI.rInner,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.2,
              overflow: "hidden",
              minHeight: 56,
              transition: "transform .14s ease, border-color .14s ease, background .14s ease",
              "&:hover": {
                transform: { xs: "none", md: "translateY(-1px)" },
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
              },
            }}
          >
            <Box sx={{ minWidth: 0, overflow: "hidden" }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.sub}
              </Typography>
            </Box>

            <EllipChip label={r.badge} sx={{ maxWidth: 96, flexShrink: 0 }} />
          </Paper>
        ))}

        {Array.from({ length: padCount }).map((_, idx) => (
          <Box key={`pad-${idx}`} sx={{ height: 56, opacity: 0, pointerEvents: "none" }} />
        ))}

        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No items.
          </Typography>
        )}
      </Box>
    </CardShell>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

  const role = localStorage.getItem("role") || "PlantManager";
  const email = localStorage.getItem("userEmail") || "user@factorysphere.dev";
  const shift = getShiftInfo();

  const [query, setQuery] = React.useState("");

  const modules = React.useMemo(() => {
    const list = [
      { key: "devices", label: "Stations & Devices", desc: "Digital Twin layout (Phase A shell)", path: "/devices", icon: <PrecisionManufacturingIcon />, badge: "TWIN" },
      { key: "alarms", label: "Live Alarms", desc: "Alert stream placeholder (Phase B real-time)", path: "/alarms", icon: <NotificationsActiveIcon />, badge: "LIVE" },
      { key: "downtime", label: "Downtime & Maintenance", desc: "Reasons + categories (UI only)", path: "/downtime", icon: <BuildCircleIcon /> },
      { key: "analytics", label: "Analytics", desc: "KPI/OEE shell (Phase B)", path: "/analytics", icon: <AnalyticsIcon /> },
      { key: "cameras", label: "Cameras", desc: "Feeds placeholder (Phase B)", path: "/cameras", icon: <VideocamIcon /> },
      { key: "reports", label: "Reports", desc: "Exports shell (Phase B)", path: "/reports", icon: <AssessmentRoundedIcon /> },
    ];

    const allowed = list.filter((m) => canAccess(role, m.key));
    const q = query.trim().toLowerCase();
    if (!q) return allowed;
    return allowed.filter((m) => (m.label + " " + m.desc).toLowerCase().includes(q));
  }, [role, query]);

  const primaryCta = React.useMemo(() => {
    if (canAccess(role, "devices")) return { label: "Open Digital Twin", path: "/devices" };
    if (canAccess(role, "alarms")) return { label: "View Alarms", path: "/alarms" };
    if (canAccess(role, "downtime")) return { label: "Open Downtime", path: "/downtime" };
    return { label: "Dashboard", path: "/dashboard" };
  }, [role]);

  const topAlarms = React.useMemo(
    () => [
      { id: "a1", title: "DT-FRT-01 • Safety Gate", sub: "Zone 2 • 2 min ago", badge: "HIGH" },
      { id: "a2", title: "C1UL-SPOILER • Sensor Fault", sub: "Line 1 • 6 min ago", badge: "MED" },
      { id: "a3", title: "WINDSHIELD • Robot Pause", sub: "Cell 4 • 11 min ago", badge: "LOW" },
      { id: "a4", title: "DT-RR-02 • E-Stop", sub: "Zone 1 • 18 min ago", badge: "HIGH" },
      { id: "a5", title: "PACK-03 • Jam Detected", sub: "Endline • 22 min ago", badge: "MED" },
    ],
    []
  );

  const topDowntime = React.useMemo(
    () => [
      { id: "d1", title: "Changeover", sub: "18 min • Shift " + shift.key, badge: "PLANNED" },
      { id: "d2", title: "Waiting Components", sub: "9 min • Line 2", badge: "SUPPLY" },
      { id: "d3", title: "Quality Check", sub: "6 min • Station 7", badge: "QC" },
      { id: "d4", title: "Maintenance", sub: "4 min • Robot Cell", badge: "MAINT" },
      { id: "d5", title: "Meeting/Break", sub: "1 min • Floor", badge: "SHIFT" },
    ],
    [shift.key]
  );

  return (
    <Box
      sx={{
        px: { xs: 1.1, sm: 2.2, md: 3 },
        py: { xs: 1.2, sm: 2.2, md: 3 },
        maxWidth: 1400,
        mx: "auto",
        overflowX: "clip",
        background: `
          radial-gradient(1100px 560px at 15% 8%, rgba(124,92,255,0.14), transparent 60%),
          radial-gradient(900px 520px at 92% 16%, rgba(45,226,230,0.10), transparent 55%),
          linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.18) 100%)
        `,
      }}
    >
      {/* Header */}
      <CardShell sx={{ mb: { xs: 1.1, sm: 2 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.1, md: 1.6 }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{
  minWidth: 0,
  flexWrap: "wrap",
  px: { xs: 2, sm: 0 },
}}>
              <Typography variant={isMdDown ? "h6" : "h5"} sx={{ fontWeight: 950, letterSpacing: -0.3 }}>
                Control Center
              </Typography>

              <EllipChip label="Phase A" />
              <EllipChip label="Mock" />
              <EllipChip label="Plant 3" />
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 0.3, sm: 1 }}
              sx={{ mt: 0.7, color: "text.secondary" }}
            >
              <Typography sx={{ lineHeight: 1.25 }}>
                {shift.label} ({shift.range}) • <b>{role}</b>
              </Typography>

              <Typography sx={{ display: { xs: "none", md: "block" }, lineHeight: 1.25 }}>
                {email}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Tooltip title="Phase A scope: UI foundation only">
              <IconButton
                aria-label="info"
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: UI.rInner,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  transition: "transform .14s ease, border-color .14s ease, background .14s ease",
                  "&:hover": {
                    transform: { xs: "none", md: "translateY(-1px)" },
                    borderColor: "rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.05)",
                  },
                }}
              >
                <InfoOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.6 }} />

        {/* Search */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules..."
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterAltRoundedIcon />}
            onClick={() => setQuery("")}
            sx={{ whiteSpace: "nowrap" }}
          >
            Clear
          </Button>
        </Stack>

        {/* Executive quick stats */}
        <GridInset sx={{ mt: 1.4 }}>
          <Grid container spacing={1.2} alignItems="stretch">
            <Grid item xs={12} sm={6} md={3}>
              <StatPill icon={<TrendingUpRoundedIcon />} label="Running" value="82" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatPill
                icon={<CancelRoundedIcon />}
                label="Down"
                value="8"
                sx={{
                  "& > div:first-of-type": {
                    background: "rgba(255,77,109,0.10)",
                    borderColor: "rgba(255,77,109,0.22)",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatPill
                icon={<PauseCircleFilledRoundedIcon />}
                label="Idle"
                value="10"
                sx={{
                  "& > div:first-of-type": {
                    background: "rgba(255,200,87,0.10)",
                    borderColor: "rgba(255,200,87,0.22)",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatPill
                icon={<WarningAmberRoundedIcon />}
                label="Alarms"
                value="12"
                sx={{
                  "& > div:first-of-type": {
                    background: "rgba(45,226,230,0.08)",
                    borderColor: "rgba(45,226,230,0.22)",
                  },
                }}
              />
            </Grid>
          </Grid>
        </GridInset>
      </CardShell>

      {/* Main layout */}
      <Box
        sx={{
          mt: { xs: 1.1, sm: 2 },
          display: "grid",
          gap: UI.gap,
          gridTemplateColumns: {
            xs: "1fr",
            md: "1fr 1fr",
            lg: "5fr 7fr",
          },
          gridTemplateAreas: {
            xs: `
              "qa"
              "alarms"
              "down"
              "mods"
            `,
            md: `
              "qa alarms"
              "down mods"
            `,
            lg: `
              "qa alarms"
              "down mods"
            `,
          },
          alignItems: "stretch",
        }}
      >
        {/* Quick Actions */}
        <Box sx={{ gridArea: "qa", minWidth: 0 }}>
          <CardShell
            sx={{
              minHeight: { xs: 240, md: 260 },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SectionHeader icon={<BoltRoundedIcon />} title="Quick Actions" rightChip="Safe" />
            <Divider sx={{ mt: 1.35, mb: 1.35 }} />

            <GridInset>
              <Grid container spacing={1.2} sx={{ flex: 1, alignContent: "flex-start" }}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    endIcon={<ArrowForwardRoundedIcon />}
                    onClick={() => navigate(primaryCta.path)}
                  >
                    {primaryCta.label}
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      if (canAccess(role, "alarms")) return navigate("/alarms");
                      if (canAccess(role, "downtime")) return navigate("/downtime");
                      return navigate("/dashboard");
                    }}
                  >
                    Open Secondary
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 1.4,
                      borderRadius: UI.rInner,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      transition: "transform .14s ease, border-color .14s ease, background .14s ease",
                      "&:hover": {
                        transform: { xs: "none", md: "translateY(-1px)" },
                        borderColor: "rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.04)",
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      Current Shift
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {shift.label} ({shift.range}) • Visibility by role
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </GridInset>
          </CardShell>
        </Box>

        {/* Top Alarms */}
        <Box sx={{ gridArea: "alarms", minWidth: 0 }}>
          <SimpleList title="Top Alarms" rightBadge="Mock" rows={topAlarms} icon={<AlarmOnRoundedIcon />} minRows={5} />
        </Box>

        {/* Downtime Drivers */}
        <Box sx={{ gridArea: "down", minWidth: 0 }}>
          <SimpleList
            title="Downtime Drivers"
            rightBadge="Mock"
            rows={topDowntime}
            icon={<TimerRoundedIcon />}
            minRows={5}
          />
        </Box>

        {/* Modules */}
        <Box sx={{ gridArea: "mods", minWidth: 0 }}>
          <CardShell
            sx={{
              minHeight: { xs: 280, md: 320 },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SectionHeader icon={<ViewModuleRoundedIcon />} title="Modules" rightChip="Permission-based" />
            <Divider sx={{ mt: 1.35, mb: 1.35 }} />

            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                alignContent: "start",
                flex: 1,
                minHeight: 0,
              }}
            >
              {modules.map((m) => (
                <ModuleRow
                  key={m.key}
                  icon={m.icon}
                  title={m.label}
                  subtitle={m.desc}
                  badge={m.badge}
                  onClick={() => navigate(m.path)}
                />
              ))}
            </Box>

            {modules.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                No modules assigned for this role.
              </Typography>
            )}
          </CardShell>
        </Box>
      </Box>

      {/* Footer hint */}
      <Box
        sx={{
          mt: { xs: 1.4, sm: 2.2 },
          color: "text.secondary",
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          gap: 1.2,
          flexWrap: "wrap",
          opacity: 0.9,
        }}
      >
        <div>Mode: UI Prototype + Mock Data • No real-time required yet</div>
        <div>{isSmDown ? "Next: Sidebar drawer + mobile polish" : "Next: Responsive Layout polish + Sidebar mobile drawer"}</div>
      </Box>
    </Box>
  );
}
