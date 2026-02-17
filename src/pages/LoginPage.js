import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Stack,
  Avatar,
} from "@mui/material";

import logo from "../assets/logo.png";
import useAuth from "../auth/useAuth";

const ROLES = [
  { key: "PlantManager", label: "Plant Manager" },
  { key: "ProductionManager", label: "Production Manager" },
  { key: "MaintenanceManager", label: "Maintenance Manager" },
  { key: "QualityManager", label: "Quality Manager" },
  { key: "EngineeringManager", label: "Engineering Manager" },
  { key: "TeamLeader", label: "Team Leader" },
  { key: "Supervisor", label: "Supervisor" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("PlantManager");

  const handleLogin = (e) => {
    e.preventDefault();

    const finalEmail = (email || "user@factorysphere.dev").trim();
    login(role, finalEmail);

    navigate("/dashboard", { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        background:
          "radial-gradient(1200px 600px at 20% 20%, rgba(124,92,255,0.20), transparent 60%), linear-gradient(180deg, #050611 0%, #070A12 50%, #060818 100%)",
      }}
    >
      <Paper
        sx={{
          width: "min(520px, 100%)",
          p: { xs: 3, md: 4 },
          borderRadius: 4,
        }}
      >
        {/* Header */}
        <Stack direction="row" spacing={1.6} alignItems="center">
          <Avatar
            src={logo}
            alt="FactorySphere"
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "transparent",
            }}
          />
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
            FactorySphere
          </Typography>
        </Stack>

        <Divider sx={{ my: 2.2 }} />

        {/* Form */}
        <Box component="form" onSubmit={handleLogin} sx={{ display: "grid", gap: 2 }}>
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@factorysphere.dev"
            fullWidth
          />

          <TextField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="devmode"
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <MenuItem key={r.key} value={r.key}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button type="submit" variant="contained" size="large" fullWidth>
            Enter
          </Button>

          <Button
            type="button"
            variant="outlined"
            fullWidth
            onClick={() => {
              setEmail("user@factorysphere.dev");
              setPassword("devmode");
            }}
          >
            Fill demo
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
