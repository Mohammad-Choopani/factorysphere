// src/pages/AlarmsPage.js

import { useMemo } from "react";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";
import { getStationsWithTelemetry } from "../services/stations.service";

function severityColor(sev) {
  if (sev === "HIGH") return "error";
  if (sev === "MED") return "warning";
  return "default";
}

export default function AlarmsPage() {
  const stations = useMemo(() => getStationsWithTelemetry(), []);

  const allAlarms = useMemo(() => {
    const list = [];

    stations.forEach((station) => {
      const latest = station.telemetry?.alarms?.latest || [];
      latest.forEach((alarm) => {
        list.push({
          ...alarm,
          stationName: station.name,
        });
      });
    });

    return list.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [stations]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Alarm History
      </Typography>

      <Stack spacing={2}>
        {allAlarms.length === 0 ? (
          <Typography color="text.secondary">No active alarms.</Typography>
        ) : (
          allAlarms.map((alarm) => (
            <Paper
              key={alarm.id}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800} noWrap>
                    {alarm.text}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Station: {alarm.stationName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alarm.ts).toLocaleString()}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={alarm.severity}
                  color={severityColor(alarm.severity)}
                  variant="outlined"
                />
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Box>
  );
}

