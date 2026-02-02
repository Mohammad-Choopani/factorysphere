import { Box, Paper, Typography, Grid, Chip, Divider, Button } from "@mui/material";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import DevicesOutlinedIcon from "@mui/icons-material/DevicesOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router-dom";

function KpiCard({ icon, title, value, hint }) {
  return (
    <Paper
      sx={{
        p: 2.2,
        borderRadius: 4,
        height: "100%",
        transition: "transform .18s ease, box-shadow .18s ease",
        "&:hover": { transform: "translateY(-2px)" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            display: "grid",
            placeItems: "center",
            background: "rgba(124,92,255,0.16)",
            border: "1px solid rgba(124,92,255,0.25)",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
            {value}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.2 }}>
        {hint}
      </Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "PlantManager";
  const email = localStorage.getItem("userEmail") || "user@factorysphere.dev";

  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        background: `
          radial-gradient(1000px 520px at 15% 10%, rgba(124,92,255,0.14), transparent 60%),
          radial-gradient(900px 500px at 90% 20%, rgba(45,226,230,0.10), transparent 55%),
          linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 100%)
        `,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
            Control Center Dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.4 }}>
            Logged in as <b>{role}</b> — {email}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip label="Phase A" />
          <Chip label="Dev Mode" />
          <Chip label="Mock Data" />
        </Box>
      </Box>

      <Divider sx={{ my: 2.5 }} />

      {/* KPI */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            icon={<DevicesOutlinedIcon />}
            title="Units Online"
            value="96 / 100"
            hint="Placeholder — will connect to real telemetry later."
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            icon={<WarningAmberOutlinedIcon />}
            title="Active Alarms"
            value="12"
            hint="Severity breakdown will appear in Phase B."
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            icon={<QueryStatsOutlinedIcon />}
            title="Shift Output"
            value="1,248"
            hint="Shift totals (06-14 / 14-22 / 22-06) planned."
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            icon={<AssessmentOutlinedIcon />}
            title="Downtime"
            value="00:37"
            hint="Mock — reason codes will be integrated later."
          />
        </Grid>
      </Grid>

      {/* Actions / Quick access */}
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: 2.4,
              borderRadius: 4,
              height: "100%",
              transition: "transform .18s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <Typography sx={{ fontWeight: 900, mb: 0.8 }}>System Overview</Typography>
            <Typography color="text.secondary">
              This dashboard is UI-ready and future-proof. Next phases will connect APIs, real-time streams, and 3D devices.
            </Typography>

            <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", mt: 2 }}>
              <Button variant="contained" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate("/devices")}>
                Go to Devices
              </Button>
              <Button variant="outlined" onClick={() => navigate("/alarms")}>
                View Alarms
              </Button>
              <Button variant="outlined" onClick={() => navigate("/reports")}>
                Reports
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper
            sx={{
              p: 2.4,
              borderRadius: 4,
              height: "100%",
              transition: "transform .18s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <Typography sx={{ fontWeight: 900, mb: 0.8 }}>Today</Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              <Paper
                sx={{
                  p: 1.6,
                  borderRadius: 3,
                  background: "rgba(0,0,0,0.20)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  Shift A (06:00–14:00)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mock summary
                </Typography>
              </Paper>
              <Paper
                sx={{
                  p: 1.6,
                  borderRadius: 3,
                  background: "rgba(0,0,0,0.20)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  Maintenance Notes
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Placeholder (alarms & downtime will feed here)
                </Typography>
              </Paper>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
