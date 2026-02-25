// src/components/station/StationHmiDrawer.jsx

import React, { useMemo, useState } from "react";
import {
  Box,
  Drawer,
  Typography,
  Tabs,
  Tab,
  Stack,
  Paper,
  Chip,
  Divider,
  IconButton,
  Button,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { getStationById, getStationTelemetry } from "../../services/stations.service";

function severityColor(sev) {
  if (sev === "HIGH") return "error";
  if (sev === "MED") return "warning";
  return "default";
}

function stateChipColor(state) {
  if (state === "RUN") return "success";
  if (state === "IDLE") return "info";
  if (state === "STOP") return "warning";
  return "error";
}

function getElapsedMinutes(startedAt) {
  if (!startedAt) return 0;
  const diffMs = Date.now() - new Date(startedAt).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2, minWidth: 0 }}>{children}</Box>;
}

function safeText(v) {
  if (v === null || v === undefined) return "N/A";
  const s = String(v);
  return s.trim() ? s : "N/A";
}

export default function StationHmiDrawer({
  open,
  onClose,
  stationId,
  stationNameFallback,
  isMobile,
}) {
  const [tab, setTab] = useState(0);

  const station = useMemo(() => {
    if (!stationId) return null;
    return getStationById(stationId);
  }, [stationId]);

  const telemetry = useMemo(() => {
    if (!stationId) return null;
    return getStationTelemetry(stationId);
  }, [stationId]);

  const alarmsLatest = telemetry?.alarms?.latest || [];
  const alarmsTop = telemetry?.alarms?.topRecurring || [];
  const downtime = telemetry?.downtime || null;

  const title = station?.name || stationNameFallback || "Station";

  // Use dynamic viewport width on mobile to avoid 100vw overflow issues
  const drawerW = isMobile ? "100dvw" : 520;

  // Safe area padding on mobile
  const mobileInsetL = "calc(12px + env(safe-area-inset-left))";
  const mobileInsetR = "calc(12px + env(safe-area-inset-right))";

  const tsLabel = telemetry?.ts ? new Date(telemetry.ts).toLocaleString() : "N/A";

  const partCode = safeText(telemetry?.part?.code);
  const partModel = safeText(telemetry?.part?.model);

  const good = telemetry?.counts?.good ?? "N/A";
  const defect = telemetry?.counts?.defect ?? "N/A";
  const suspect = telemetry?.counts?.suspect ?? "N/A";

  const currentSec = telemetry?.cycle?.currentSec ?? "N/A";
  const avgSec = telemetry?.cycle?.avgSec ?? "N/A";
  const targetSec = telemetry?.cycle?.targetSec ?? "N/A";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: drawerW,
          maxWidth: drawerW,
          m: 0,
          boxSizing: "border-box",
          bgcolor: "#0f1623",
          color: "rgba(255,255,255,0.92)",
          borderLeft: isMobile ? "none" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: isMobile ? 0 : 2.5,
          overflowX: "hidden",
          overscrollBehavior: "contain",
          display: "flex",
          flexDirection: "column",
          paddingLeft: { xs: mobileInsetL, sm: 0 },
          paddingRight: { xs: mobileInsetR, sm: 0 },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }} noWrap>
            {title}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }} noWrap>
            {stationId ? `Station ID: ${stationId}` : "No station mapping yet"}
          </Typography>
        </Box>

        {telemetry?.state ? (
          <Chip
            size="small"
            label={telemetry.state}
            color={stateChipColor(telemetry.state)}
            variant="outlined"
          />
        ) : (
          <Chip size="small" label="NO DATA" variant="outlined" />
        )}

        <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.8)" }}>
          <CloseRoundedIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Tabs */}
      <Box sx={{ px: 2, pt: 1, pb: 0.5, minWidth: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="inherit"
          indicatorColor="primary"
          sx={{
            minWidth: 0,
            "& .MuiTabs-flexContainer": { gap: 0.5 },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 800,
              color: "rgba(255,255,255,0.75)",
              minHeight: 42,
              minWidth: "auto",
              px: 1.25,
            },
            "& .Mui-selected": { color: "rgba(255,255,255,0.92)" },
          }}
        >
          <Tab label="Overview" />
          <Tab label="Alarms" />
          <Tab label="Downtime" />
          <Tab label="Shift Totals" />
        </Tabs>
      </Box>

      {/* Body scroll area */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          overflowY: "auto",
          overflowX: "hidden",
          flex: 1,
          minWidth: 0,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {!stationId ? (
          <Paper
            sx={{
              p: 2,
              mt: 2,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              minWidth: 0,
            }}
          >
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Station mapping is missing</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              This unit is not linked to a stationId yet. Add a stationId field to your unit in
              plant3.units.mock.js (recommended).
            </Typography>
          </Paper>
        ) : null}

        {/* Overview */}
        <TabPanel value={tab} index={0}>
          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                minWidth: 0,
              }}
            >
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Production Snapshot</Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
                <Chip size="small" label={`Part: ${partCode}`} variant="outlined" />
                <Chip size="small" label={`Model: ${partModel}`} variant="outlined" />
                <Chip size="small" label={`Good: ${good}`} variant="outlined" />
                <Chip size="small" label={`Defect: ${defect}`} variant="outlined" />
                <Chip size="small" label={`Suspect: ${suspect}`} variant="outlined" />
              </Stack>

              <Box sx={{ mt: 1.5, color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                Last update:{" "}
                <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 800 }}>{tsLabel}</span>
              </Box>
            </Paper>

            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                minWidth: 0,
              }}
            >
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Cycle</Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
                <Chip size="small" label={`Current: ${currentSec}s`} variant="outlined" />
                <Chip size="small" label={`Avg: ${avgSec}s`} variant="outlined" />
                <Chip size="small" label={`Target: ${targetSec}s`} variant="outlined" />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }} useFlexGap>
                <Button variant="outlined">Print Partial</Button>
                <Button variant="outlined">Shift Change</Button>
                <Button variant="outlined">Down Time</Button>
                <Button variant="outlined">Suspect / Defect</Button>
                <Button variant="outlined">Change Part</Button>
              </Stack>
            </Paper>
          </Stack>
        </TabPanel>

        {/* Alarms */}
        <TabPanel value={tab} index={1}>
          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                minWidth: 0,
              }}
            >
              <Typography sx={{ fontWeight: 900, mb: 1 }}>
                Latest Alarms ({telemetry?.alarms?.activeCount ?? 0})
              </Typography>

              {alarmsLatest.length === 0 ? (
                <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                  No active alarms.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ minWidth: 0 }}>
                  {alarmsLatest.map((a) => (
                    <Paper
                      key={a.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: "rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        minWidth: 0,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" gap={1} sx={{ minWidth: 0 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 900 }} noWrap>
                            {safeText(a.text)}
                          </Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                            {safeText(a.code)} | {a.ts ? new Date(a.ts).toLocaleString() : "N/A"}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={safeText(a.severity)}
                          color={severityColor(a.severity)}
                          variant="outlined"
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>

            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                minWidth: 0,
              }}
            >
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Top Recurring (24h)</Typography>

              {alarmsTop.length === 0 ? (
                <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                  No recurring alarms data.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ minWidth: 0 }}>
                  {alarmsTop.map((a) => (
                    <Paper
                      key={a.code}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: "rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        minWidth: 0,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" gap={1} sx={{ minWidth: 0 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 900 }} noWrap>
                            {safeText(a.text)}
                          </Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                            {safeText(a.code)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                          <Chip size="small" label={`x${a.count24h ?? 0}`} variant="outlined" />
                          <Chip
                            size="small"
                            label={safeText(a.severity)}
                            color={severityColor(a.severity)}
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        </TabPanel>

        {/* Downtime */}
        <TabPanel value={tab} index={2}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              minWidth: 0,
            }}
          >
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Downtime</Typography>

            {!downtime ? (
              <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                No downtime data.
              </Typography>
            ) : downtime.active ? (
              <>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1, minWidth: 0 }}>
                  <Chip size="small" label="ACTIVE" color="warning" variant="outlined" />
                  <Chip size="small" label={`Category: ${safeText(downtime.category)}`} variant="outlined" />
                  <Chip size="small" label={`Reason: ${safeText(downtime.reasonText)}`} variant="outlined" />
                  <Chip
                    size="small"
                    label={`${getElapsedMinutes(downtime.startedAt)} min`}
                    color="warning"
                    variant="outlined"
                  />
                </Stack>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                  Started:{" "}
                  <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 800 }}>
                    {downtime.startedAt ? new Date(downtime.startedAt).toLocaleString() : "N/A"}
                  </span>
                </Typography>
              </>
            ) : (
              <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                No active downtime.
              </Typography>
            )}
          </Paper>
        </TabPanel>

        {/* Shift Totals */}
        <TabPanel value={tab} index={3}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              minWidth: 0,
            }}
          >
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Shift Totals</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              This tab is ready. Next we will wire it to your shift totals source.
            </Typography>
          </Paper>
        </TabPanel>
      </Box>
    </Drawer>
  );
}