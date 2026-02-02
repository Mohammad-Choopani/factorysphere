import { Box, Typography, Paper } from "@mui/material";

export default function CamerasPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
        Cameras
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography sx={{ opacity: 0.8 }}>
          Placeholder: Camera monitoring panel will be implemented here (mock first, then real feeds).
        </Typography>
      </Paper>
    </Box>
  );
}
