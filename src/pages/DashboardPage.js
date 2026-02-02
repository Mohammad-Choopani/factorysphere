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
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import VideocamIcon from "@mui/icons-material/Videocam";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import { useNavigate } from "react-router-dom";
import { PAGE_PERMISSIONS } from "../utils/permissions";

function getShiftInfo(now = new Date()) {
  const h = now.getHours();
  const m = now.getMinutes();
  const minutes = h * 60 + m;

  // Plant 3 shifts (locked):
  // A: 06:00–14:00, B: 14:00–22:00, C: 22:00–06:00
  if (minutes >= 360 && minutes < 840) return { key: "A", label: "Shift A", range: "06:00–14:00" };
  if (minutes >= 840 && minutes < 1320) return { key: "B", label: "Shift B", range: "14:00–22:00" };
  return { key: "C", label: "Shift C", range: "22:00–06:00" };
}

function canAccess(role, pageKey) {
  const allowed = PAGE_PERMISSIONS?.[pageKey] || [];
  return allowed.includes(role);
}

function CardShell({ children, sx }) {
  return (
    <Paper
      sx={{
        p: 2.2,
        borderRadius: 4,
        height: "100%",
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "rgba(255,255,255,0.14)",
        },
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

function KpiMini({ label, value, hint }) {
  return (
    <CardShell
      sx={{
        p: 2,
        animation: "dashIn 320ms ease both",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3, mt: 0.5 }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {hint}
        </Typography>
      ) : null}
    </CardShell>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const role = localStorage.getItem("role") || "PlantManager";
  const email = localStorage.getItem("userEmail") || "user@factorysphere.dev";
  const shift = getShiftInfo();

  const modules = React.useMemo(() => {
    const list = [
      { key: "devices", label: "Stations & Devices", path: "/devices", icon: <PrecisionManufacturingIcon /> },
      { key: "alarms", label: "Live Alarms", path: "/alarms", icon: <NotificationsActiveIcon /> },
      { key: "downtime", label: "Downtime & Maintenance", path: "/downtime", icon: <BuildCircleIcon /> },
      { key: "analytics", label: "Analytics", path: "/analytics", icon: <AnalyticsIcon /> },
      { key: "cameras", label: "Cameras", path: "/cameras", icon: <VideocamIcon /> },
      { key: "reports", label: "Reports", path: "/reports", icon: <AssessmentRoundedIcon /> },
    ];
    return list.filter((m) => canAccess(role, m.key));
  }, [role]);

  const primaryCta = React.useMemo(() => {
    const devicesAllowed = canAccess(role, "devices");
    const alarmsAllowed = canAccess(role, "alarms");
    if (devicesAllowed) return { label: "Open Digital Twin", path: "/devices" };
    if (alarmsAllowed) return { label: "View Alarms", path: "/alarms" };
    return { label: "Dashboard", path: "/dashboard" };
  }, [role]);

  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        minHeight: "calc(100vh - 64px)",
        background: `
          radial-gradient(1000px 520px at 15% 10%, rgba(124,92,255,0.12), transparent 60%),
          radial-gradient(900px 500px at 90% 20%, rgba(45,226,230,0.08), transparent 55%),
          linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 100%)
        `,
        "@keyframes dashIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0px)" },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ animation: "dashIn 260ms ease both" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
              Control Center
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.4 }}>
              Plant 3 • {shift.label} ({shift.range}) • <b>{role}</b>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {" "}
                — {email}
              </Box>
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip label="Phase A" size="small" />
            <Chip label="Mock Data" size="small" />
            <Chip label="Dev Mode" size="small" />
          </Stack>
        </Stack>

        <Divider sx={{ my: 2.2 }} />
      </Box>

      {/* KPIs (minimal, non-overloaded) */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiMini
            label="Units Online"
            value="96 / 100"
            hint="Placeholder — real telemetry in Phase B."
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiMini
            label="Active Alarms"
            value="12"
            hint="Severity breakdown in Phase B."
          />
        </Grid>
        <Grid item xs={12} sm={12} lg={4}>
          <KpiMini
            label="Shift Output"
            value="1,248"
            hint="Shift totals are mock for Phase A."
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Primary actions */}
        <Grid item xs={12} lg={7}>
          <CardShell sx={{ animation: "dashIn 320ms ease both" }}>
            <Typography sx={{ fontWeight: 900, mb: 0.8 }}>Quick Access</Typography>
            <Typography color="text.secondary">
              Phase A UI foundation. Features are mock but structured for future real-time integration.
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.2}
              sx={{ mt: 2 }}
            >
              <Button
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate(primaryCta.path)}
              >
                {primaryCta.label}
              </Button>

              {canAccess(role, "alarms") && (
                <Button variant="outlined" onClick={() => navigate("/alarms")}>
                  Alarms
                </Button>
              )}

              {canAccess(role, "downtime") && (
                <Button variant="outlined" onClick={() => navigate("/downtime")}>
                  Downtime
                </Button>
              )}
            </Stack>
          </CardShell>
        </Grid>

        {/* Modules (role-based) */}
        <Grid item xs={12} lg={5}>
          <CardShell sx={{ animation: "dashIn 360ms ease both" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontWeight: 900 }}>Modules</Typography>
              <Chip size="small" label="Visibility by role" />
            </Stack>

            <Divider sx={{ my: 1.6 }} />

            <Box sx={{ display: "grid", gap: 1 }}>
              {modules.map((m) => (
                <Paper
                  key={m.key}
                  onClick={() => navigate(m.path)}
                  role="button"
                  tabIndex={0}
                  sx={{
                    p: 1.4,
                    borderRadius: 3,
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    transition: "transform .18s ease, border-color .18s ease, background .18s ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      borderColor: "rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.04)",
                    },
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 3,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(124,92,255,0.14)",
                      border: "1px solid rgba(124,92,255,0.22)",
                    }}
                  >
                    {m.icon}
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Coming in Phase B (placeholder shell)
                    </Typography>
                  </Box>

                  <ArrowForwardRoundedIcon style={{ opacity: 0.65 }} />
                </Paper>
              ))}

              {modules.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No modules assigned for this role.
                </Typography>
              )}
            </Box>
          </CardShell>
        </Grid>
      </Grid>
    </Box>
  );
}
