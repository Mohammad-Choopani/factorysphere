import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

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

  const [showForm, setShowForm] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("PlantManager");

  const handleLogin = (e) => {
    e.preventDefault();
    const finalEmail = (email || "user@factorysphere.dev").trim();
    login(role, finalEmail);
    navigate("/dashboard", { replace: true });
  };

  const inputSx = {
    "& .MuiInputLabel-root": {
      color: "rgba(230,235,255,0.55)",
      letterSpacing: 0.2,
    },
    "& .MuiInput-root:before": {
      borderBottomColor: "rgba(255,255,255,0.18)",
    },
    "& .MuiInput-root:hover:not(.Mui-disabled):before": {
      borderBottomColor: "rgba(255,255,255,0.35)",
    },
    "& .MuiInput-root:after": {
      borderBottomColor: "rgba(124,92,255,0.95)",
    },
    "& .MuiInputBase-input": {
      color: "rgba(246,248,255,0.92)",
      fontWeight: 600,
      letterSpacing: 0.2,
    },
    "& .MuiSelect-select": {
      color: "rgba(246,248,255,0.92)",
      fontWeight: 700,
      letterSpacing: 0.2,
    },
    "& .MuiSvgIcon-root": {
      color: "rgba(255,255,255,0.55)",
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(1200px 600px at 20% 20%, rgba(124,92,255,0.22), transparent 62%), radial-gradient(900px 500px at 85% 30%, rgba(0,210,255,0.10), transparent 55%), linear-gradient(180deg, #040510 0%, #060916 50%, #050716 100%)",
        color: "#fff",
      }}
    >
      {/* Subtle noise + glass haze (no box boundaries) */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(700px 340px at 50% 35%, rgba(255,255,255,0.06), transparent 60%)",
          filter: "blur(0px)",
          opacity: 0.9,
        }}
      />

      <Stack
        spacing={3}
        alignItems="center"
        sx={{
          width: "min(520px, 92vw)",
          px: 2,
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            transform: showForm ? "translateY(-4px)" : "translateY(0px)",
            transition: "transform 320ms ease",
          }}
        >
          <Avatar
            src={logo}
            alt="FactorySphere"
            sx={{
              width: { xs: 88, md: 96 },
              height: { xs: 88, md: 96 },
              bgcolor: "transparent",
              filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.45))",
            }}
          />
        </Box>

        <Stack spacing={0.7} alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              letterSpacing: 0.6,
              textShadow: "0 10px 28px rgba(0,0,0,0.55)",
            }}
          >
            FactorySphere
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              color: "rgba(230,235,255,0.62)",
              letterSpacing: 0.35,
            }}
          >
            Industrial Control Center • Phase A (Dev Mode)
          </Typography>
        </Stack>

        {/* LOCK STATE */}
        {!showForm && (
          <Stack spacing={1.6} alignItems="center" sx={{ mt: 0.5 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => setShowForm(true)}
              startIcon={<VpnKeyRoundedIcon />}
              sx={{
                color: "rgba(246,248,255,0.95)",
                borderColor: "rgba(255,255,255,0.22)",
                px: 5,
                py: 1.2,
                borderRadius: 999,
                backdropFilter: "blur(8px)",
                backgroundColor: "rgba(255,255,255,0.06)",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.10)",
                  borderColor: "rgba(255,255,255,0.30)",
                },
              }}
            >
              Sign in
            </Button>

            <Button
              type="button"
              variant="text"
              onClick={() => {
                setEmail("user@factorysphere.dev");
                setPassword("devmode");
                setRole("PlantManager");
              }}
              sx={{
                color: "rgba(230,235,255,0.66)",
                fontSize: 13,
                textTransform: "none",
              }}
            >
              Fill demo credentials
            </Button>
          </Stack>
        )}

        {/* AUTH STATE */}
        <Fade in={showForm} timeout={280}>
          <Box
            component="form"
            onSubmit={handleLogin}
            sx={{
              display: showForm ? "grid" : "none",
              gap: 2.1,
              width: "min(360px, 92vw)",
              mt: 1,
            }}
          >
            {/* Top actions row */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Tooltip title="Back">
                <IconButton
                  onClick={() => setShowForm(false)}
                  size="small"
                  sx={{
                    color: "rgba(246,248,255,0.75)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(8px)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.10)" },
                  }}
                >
                  <ArrowBackRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Stack direction="row" spacing={1}>
                <Tooltip title="Fill demo">
                  <IconButton
                    onClick={() => {
                      setEmail("user@factorysphere.dev");
                      setPassword("devmode");
                      setRole("PlantManager");
                    }}
                    size="small"
                    sx={{
                      color: "rgba(246,248,255,0.75)",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      backdropFilter: "blur(8px)",
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.10)" },
                    }}
                  >
                    <PersonRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Role Select (No box feel) */}
            <FormControl variant="standard" fullWidth sx={inputSx}>
              <InputLabel id="role-label">Access Level</InputLabel>
              <Select
                labelId="role-label"
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

            {/* Inputs (standard underline, same background) */}
            <TextField
              variant="standard"
              label="Email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@factorysphere.dev"
              sx={inputSx}
            />

            <TextField
              variant="standard"
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="devmode"
              sx={inputSx}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{
                mt: 1.2,
                borderRadius: 999,
                py: 1.15,
                fontWeight: 900,
                letterSpacing: 0.4,
                boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
              }}
            >
              Enter
            </Button>
          </Box>
        </Fade>

        {/* Footer subtle (still no boxes) */}
        <Typography
          sx={{
            mt: 2,
            fontSize: 12,
            color: "rgba(230,235,255,0.40)",
            letterSpacing: 0.3,
          }}
        >
          © FactorySphere • UI Prototype (Phase A)
        </Typography>
      </Stack>
    </Box>
  );
}