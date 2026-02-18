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

import { useNavigate } from "react-router-dom";
import { PAGE_PERMISSIONS } from "../utils/permissions";

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

function CardShell({ children, sx, onClick, role = "region" }) {
  return (
    <Paper
      role={role}
      onClick={onClick}
      sx={{
        p: { xs: 1.6, sm: 2.1 },
        borderRadius: 4,
        height: "100%",
        maxWidth: "100%",
        position: "relative",
        overflow: "hidden", // ✅ prevents any chip/text bleeding outside
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
        ...(onClick
          ? {
              cursor: "pointer",
              "&:hover": {
                transform: { xs: "none", md: "translateY(-2px)" },
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.03)",
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

function KpiTile({ label, value, hint, tone = "primary" }) {
  const ring =
    tone === "primary"
      ? "rgba(124,92,255,0.22)"
      : tone === "cyan"
      ? "rgba(45,226,230,0.20)"
      : tone === "warn"
      ? "rgba(255,200,87,0.18)"
      : "rgba(255,77,109,0.16)";

  return (
    <CardShell
      sx={{
        "@keyframes dashIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0px)" },
        },
        animation: "dashIn 280ms ease both",
        "&:before": {
          content: '""',
          position: "absolute",
          inset: -2,
          background: `radial-gradient(600px 260px at 20% 20%, ${ring}, transparent 55%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4, mt: 0.5 }}>
          {value}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </CardShell>
  );
}

function StatPill({ icon, label, value, sx }) {
  return (
    <Paper
      sx={{
        p: 1.2,
        borderRadius: 3,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 1.2,
        overflow: "hidden",
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 3,
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
          sx={{ display: "block", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 950, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
        borderRadius: 3,
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        alignItems: "center",
        gap: 1.2,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 3,
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
              lineHeight: 1.1,
              minWidth: 0,
            }}
          >
            {title}
          </Typography>
          {badge ? <Chip size="small" label={badge} sx={{ height: 22, fontWeight: 900, flexShrink: 0 }} /> : null}
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {subtitle}
        </Typography>
      </Box>

      <ArrowForwardRoundedIcon style={{ opacity: 0.65, flexShrink: 0 }} />
    </CardShell>
  );
}

function SimpleList({ title, rows, rightBadge }) {
  return (
    <CardShell>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ gap: 1, minWidth: 0, overflow: "hidden" }}
      >
        <Typography
          sx={{
            fontWeight: 950,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </Typography>

        {rightBadge ? (
          <Chip
            size="small"
            label={rightBadge}
            sx={{
              flexShrink: 0,
              maxWidth: "50%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          />
        ) : null}
      </Stack>

      <Divider sx={{ my: 1.4 }} />

      <Box sx={{ display: "grid", gap: 1 }}>
        {rows.map((r) => (
          <Paper
            key={r.id}
            sx={{
              p: 1.1,
              borderRadius: 3,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.2,
              overflow: "hidden", // ✅ stop badge from bleeding
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
                sx={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {r.sub}
              </Typography>
            </Box>

            <Chip
              size="small"
              label={r.badge}
              sx={{
                height: 22,
                fontWeight: 900,
                flexShrink: 0,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            />
          </Paper>
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

  const role = localStorage.getItem("role") || "PlantManager";
  const email = localStorage.getItem("userEmail") || "user@factorysphere.dev";
  const shift = getShiftInfo();

  const [query, setQuery] = React.useState("");

  const modules = React.useMemo(() => {
    const list = [
      {
        key: "devices",
        label: "Stations & Devices",
        desc: "Digital Twin layout (Phase A shell)",
        path: "/devices",
        icon: <PrecisionManufacturingIcon />,
        badge: "TWIN",
      },
      {
        key: "alarms",
        label: "Live Alarms",
        desc: "Alert stream placeholder (Phase B real-time)",
        path: "/alarms",
        icon: <NotificationsActiveIcon />,
        badge: "LIVE",
      },
      {
        key: "downtime",
        label: "Downtime & Maintenance",
        desc: "Reasons + categories (UI only)",
        path: "/downtime",
        icon: <BuildCircleIcon />,
      },
      {
        key: "analytics",
        label: "Analytics",
        desc: "KPI/OEE shell (Phase B)",
        path: "/analytics",
        icon: <AnalyticsIcon />,
      },
      {
        key: "cameras",
        label: "Cameras",
        desc: "Feeds placeholder (Phase B)",
        path: "/cameras",
        icon: <VideocamIcon />,
      },
      {
        key: "reports",
        label: "Reports",
        desc: "Exports shell (Phase B)",
        path: "/reports",
        icon: <AssessmentRoundedIcon />,
      },
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

  // Mock executive panels (Phase A)
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
        px: { xs: 1.2, sm: 2.2, md: 3 },
        py: { xs: 1.4, sm: 2.2, md: 3 },
        background: `
          radial-gradient(1100px 560px at 15% 8%, rgba(124,92,255,0.14), transparent 60%),
          radial-gradient(900px 520px at 92% 16%, rgba(45,226,230,0.10), transparent 55%),
          linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.18) 100%)
        `,
      }}
    >
      {/* Header */}
      <CardShell sx={{ p: { xs: 1.5, sm: 2.1 }, mb: { xs: 1.2, sm: 2 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.1, md: 1.6 }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flexWrap: "wrap" }}>
              <Typography variant={isMdDown ? "h6" : "h5"} sx={{ fontWeight: 950, letterSpacing: -0.3 }}>
                Control Center
              </Typography>
              <Chip size="small" label="Phase A" />
              <Chip size="small" label="Mock" />
              <Chip size="small" label="Plant 3" />
            </Stack>

            <Typography color="text.secondary" sx={{ mt: 0.45, lineHeight: 1.35 }}>
              {shift.label} ({shift.range}) • <b>{role}</b>
              <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                {" "}
                — {email}
              </Box>
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Tooltip title="Phase A scope: UI foundation only">
              <IconButton
                aria-label="info"
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <InfoOutlinedIcon />
              </IconButton>
            </Tooltip>

            <Button variant="contained" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate(primaryCta.path)}>
              {primaryCta.label}
            </Button>
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
          <Button variant="outlined" startIcon={<FilterAltRoundedIcon />} onClick={() => setQuery("")} sx={{ whiteSpace: "nowrap" }}>
            Clear
          </Button>
        </Stack>

        {/* Executive quick stats */}
        <Grid container spacing={1.2} sx={{ mt: 1.4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatPill icon={<TrendingUpRoundedIcon />} label="Running" value="82" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatPill
              icon={<CancelRoundedIcon />}
              label="Down"
              value="8"
              sx={{ "& > div:first-of-type": { background: "rgba(255,77,109,0.10)", borderColor: "rgba(255,77,109,0.22)" } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatPill
              icon={<PauseCircleFilledRoundedIcon />}
              label="Idle"
              value="10"
              sx={{ "& > div:first-of-type": { background: "rgba(255,200,87,0.10)", borderColor: "rgba(255,200,87,0.22)" } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatPill
              icon={<WarningAmberRoundedIcon />}
              label="Alarms"
              value="12"
              sx={{ "& > div:first-of-type": { background: "rgba(45,226,230,0.08)", borderColor: "rgba(45,226,230,0.22)" } }}
            />
          </Grid>
        </Grid>
      </CardShell>

      {/* KPI strip */}
      <Grid container spacing={{ xs: 1.1, sm: 2 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiTile label="Units Online" value="96 / 100" hint="Placeholder in Phase A." tone="cyan" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiTile label="Active Alarms" value="12" hint="Severity breakdown in Phase B." tone="warn" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiTile label="Shift Output" value="1,248" hint="Mock totals for Phase A." tone="primary" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiTile label="Downtime (min)" value="38" hint="Reason codes in Phase B." tone="danger" />
        </Grid>
      </Grid>

      {/* Main content */}
      <Grid container spacing={{ xs: 1.1, sm: 2 }} sx={{ mt: { xs: 1.1, sm: 2 } }}>
        {/* Left column */}
        <Grid item xs={12} lg={5}>
          <Grid container spacing={{ xs: 1.1, sm: 2 }}>
            <Grid item xs={12}>
              <CardShell>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1, minWidth: 0, overflow: "hidden" }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, overflow: "hidden" }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 3,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(45,226,230,0.10)",
                        border: "1px solid rgba(45,226,230,0.22)",
                        flexShrink: 0,
                      }}
                    >
                      <BoltRoundedIcon />
                    </Box>
                    <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                      <Typography sx={{ fontWeight: 950, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Quick Actions
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        Phase A UI shell (no real actions)
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip size="small" label="Safe" sx={{ flexShrink: 0 }} />
                </Stack>

                <Divider sx={{ my: 1.4 }} />

                <Grid container spacing={1.2}>
                  {/* ✅ keep primary CTA only once in this card */}
                  <Grid item xs={12}>
                    <Button fullWidth variant="contained" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate(primaryCta.path)}>
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
                        p: 1.5,
                        borderRadius: 3,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        overflow: "hidden",
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
              </CardShell>
            </Grid>

            <Grid item xs={12}>
              <SimpleList title="Top Alarms" rightBadge="Mock" rows={topAlarms} />
            </Grid>
          </Grid>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} lg={7}>
          <Grid container spacing={{ xs: 1.1, sm: 2 }}>
            <Grid item xs={12}>
              <SimpleList title="Downtime Drivers" rightBadge="Mock" rows={topDowntime} />
            </Grid>

            <Grid item xs={12}>
              <CardShell>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ gap: 1, minWidth: 0, overflow: "hidden" }}
                >
                  <Typography
                    sx={{
                      fontWeight: 950,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Modules
                  </Typography>

                  <Chip
                    size="small"
                    label="Permission-based"
                    sx={{
                      flexShrink: 0,
                      maxWidth: "60%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  />
                </Stack>

                <Divider sx={{ my: 1.4 }} />

                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
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
            </Grid>
          </Grid>
        </Grid>
      </Grid>

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
        <div>Next: Responsive Layout polish + Sidebar mobile drawer</div>
      </Box>
    </Box>
  );
}
