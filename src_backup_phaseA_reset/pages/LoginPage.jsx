import { useState } from "react";
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
} from "@mui/material";

const ROLES = [
  { key: "PlantManager", label: "Plant Manager" },
  { key: "ProductionManager", label: "Production Manager" },
  { key: "MaintenanceManager", label: "Maintenance Manager" },
  { key: "QualityManager", label: "Quality Manager" },
  { key: "EngineeringManager", label: "Engineering Manager" },
  { key: "TeamLeader", label: "Team Leader" },
];

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(localStorage.getItem("userEmail") || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(localStorage.getItem("role") || "PlantManager");

  const handleLogin = (e) => {
    e.preventDefault();

    const finalEmail = (email || "user@factorysphere.dev").trim();

    localStorage.setItem("role", role);
    localStorage.setItem("userEmail", finalEmail);

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
      <Paper sx={{ width: "min(520px, 100%)", p: { xs: 3, md: 4 }, borderRadius: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.2 }}>
          FactorySphere Login
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
          Dev mode authentication
        </Typography>

        <Divider sx={{ my: 2.2 }} />

        <Box component="form" onSubmit={handleLogin} sx={{ display: "grid", gap: 2 }}>
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />

          <TextField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id="role-label">Role (Dev)</InputLabel>
            <Select
              labelId="role-label"
              label="Role (Dev)"
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
            Login
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
