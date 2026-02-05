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
        p: { xs: 1.8, sm: 2.2 },
        borderRadius: 4,
        height: "100%",
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
        position: "relative",
        overflow: "hidden",
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
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
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

function ModuleRow({ icon, title, subtitle, badge, onClick }) {
  return (
    <CardShell
      onClick={onClick}
      role="button"
      sx={{
        p: 1.35,
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

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 900,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.1,
            }}
          >
            {title}
          </Typography>
          {badge ? <Chip size="small" label={badge} sx={{ height: 22, fontWeight: 900 }} /> : null}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {subtitle}
        </Typography>
      </Box>

      <ArrowForwardRoundedIcon style={{ opacity: 0.65, flexShrink: 0 }} />
    </CardShell>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 899px)");

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

  return (
    <Box
      sx={{
        px: { xs: 1.4, sm: 2.2, md: 3 },
        py: { xs: 1.6, sm: 2.2, md: 3 },
        background: `
          radial-gradient(1100px 560px at 15% 8%, rgba(124,92,255,0.14), transparent 60%),
          radial-gradient(900px 520px at 92% 16%, rgba(45,226,230,0.10), transparent 55%),
          linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.18) 100%)
        `,
      }}
    >
      {/* Top Header */}
      <CardShell sx={{ p: { xs: 1.6, sm: 2.2 }, mb: { xs: 1.4, sm: 2 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.2, md: 1.6 }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 950, letterSpacing: -0.3 }}>
                Control Center
              </Typography>
              <Chip size="small" label="Phase A" />
              <Chip size="small" label="Mock" />
            </Stack>

            <Typography color="text.secondary" sx={{ mt: 0.4, lineHeight: 1.35 }}>
              Plant 3 • {shift.label} ({shift.range}) • <b>{role}</b>
              <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                {" "}
                — {email}
              </Box>
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Tooltip title="What is Phase A?">
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

            <Button
              variant="contained"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={() => navigate(primaryCta.path)}
            >
              {primaryCta.label}
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.8 }} />

        {/* Search + quick filter */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
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
      </CardShell>

      {/* KPI strip */}
      <Grid container spacing={{ xs: 1.2, sm: 2 }}>
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
      <Grid container spacing={{ xs: 1.2, sm: 2 }} sx={{ mt: { xs: 1.2, sm: 2 } }}>
        {/* Left: Quick actions */}
        <Grid item xs={12} lg={5}>
          <CardShell>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 3,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(45,226,230,0.10)",
                    border: "1px solid rgba(45,226,230,0.22)",
                  }}
                >
                  <BoltRoundedIcon />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 950, lineHeight: 1.1 }}>Quick Actions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Phase A UI shell (no real actions)
                  </Typography>
                </Box>
              </Stack>

              <Chip size="small" label="Safe" />
            </Stack>

            <Divider sx={{ my: 1.6 }} />

            <Grid container spacing={1.2}>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate(primaryCta.path)}
                >
                  {primaryCta.label}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
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
                    p: 1.6,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 850 }}>
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

        {/* Right: Modules */}
        <Grid item xs={12} lg={7}>
          <CardShell>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1 }}>
              <Typography sx={{ fontWeight: 950 }}>Modules</Typography>
              <Chip size="small" label="Permission-based" />
            </Stack>

            <Divider sx={{ my: 1.6 }} />

            <Box sx={{ display: "grid", gap: 1 }}>
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

              {modules.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No modules assigned for this role.
                </Typography>
              )}
            </Box>
          </CardShell>
        </Grid>
      </Grid>

      {/* Footer hint */}
      <Box
        sx={{
          mt: { xs: 1.6, sm: 2.2 },
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
        <div>Next: RBAC routes + Pro Devices 3D</div>
      </Box>
    </Box>
  );
}
