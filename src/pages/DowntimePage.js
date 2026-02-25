// src/pages/DowntimePage.js

import { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
} from "@mui/material";
import { getStationsWithTelemetry } from "../services/stations.service";

function getElapsedMinutes(startedAt) {
  if (!startedAt) return 0;
  const diffMs = Date.now() - new Date(startedAt).getTime();
  return Math.floor(diffMs / 60000);
}

export default function DowntimePage() {
  const stations = useMemo(() => getStationsWithTelemetry(), []);

  const activeDowntimeStations = useMemo(() => {
    return stations
      .filter((s) => s.telemetry?.downtime?.active)
      .map((s) => ({
        stationName: s.name,
        category: s.telemetry.downtime.category,
        reason: s.telemetry.downtime.reasonText,
        startedAt: s.telemetry.downtime.startedAt,
      }));
  }, [stations]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Active Downtime
      </Typography>

      <Stack spacing={2}>
        {activeDowntimeStations.length === 0 ? (
          <Typography color="text.secondary">
            No active downtime.
          </Typography>
        ) : (
          activeDowntimeStations.map((item, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={2}
              >
                <Box>
                  <Typography fontWeight={700}>
                    {item.stationName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Category: {item.category}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reason: {item.reason}
                  </Typography>
                </Box>

                <Chip
                  label={`${getElapsedMinutes(item.startedAt)} min`}
                  color="warning"
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

