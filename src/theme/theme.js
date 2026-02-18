// src/theme/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    mode: "dark",
    background: {
      default: "#070A12",
      paper: "rgba(18, 22, 38, 0.72)",
    },
    primary: { main: "#7C5CFF" },
    secondary: { main: "#2DE2E6" },
    success: { main: "#3DFF87" },
    warning: { main: "#FFC857" },
    error: { main: "#FF4D6D" },
    text: {
      primary: "#E9ECF1",
      secondary: "rgba(233, 236, 241, 0.72)",
    },
    divider: "rgba(255,255,255,0.08)",
  },
  shape: { borderRadius: 18 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
    h4: { fontWeight: 800, letterSpacing: -0.3, fontSize: "1.6rem" },
    h5: { fontWeight: 800, letterSpacing: -0.25, fontSize: "1.25rem" },
    h6: { fontWeight: 700, letterSpacing: -0.2, fontSize: "1.05rem" },
    subtitle1: { fontWeight: 700, opacity: 0.95 },
    body1: { fontWeight: 500 },
    body2: { fontWeight: 500 },
    caption: { fontWeight: 600, opacity: 0.82 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "radial-gradient(1200px 600px at 20% 0%, rgba(124, 92, 255, 0.12), transparent 60%), radial-gradient(900px 500px at 90% 20%, rgba(45, 226, 230, 0.10), transparent 55%)",
          backgroundAttachment: "fixed",
        },
      },
    },

    MuiContainer: {
      defaultProps: {
        maxWidth: "xl",
      },
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow:
            "0 22px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02) inset",
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          paddingInline: 16,
          paddingBlock: 10,
          transition: "transform .18s ease, box-shadow .18s ease, filter .18s ease",
        },
        contained: {
          boxShadow: "0 14px 40px rgba(124, 92, 255, 0.25)",
          "&:hover": {
            transform: "translateY(-1px)",
            filter: "brightness(1.02)",
            boxShadow: "0 18px 55px rgba(124, 92, 255, 0.35)",
          },
          "&:active": { transform: "translateY(0px) scale(0.99)" },
        },
        outlined: {
          borderColor: "rgba(255,255,255,0.16)",
          "&:hover": { borderColor: "rgba(255,255,255,0.28)" },
        },
      },
    },

    MuiTextField: {
      defaultProps: { size: "medium" },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          background: "rgba(10, 12, 22, 0.55)",
          transition: "transform .18s ease, box-shadow .18s ease",
          "&:hover": {
            boxShadow: "0 10px 35px rgba(0,0,0,0.35)",
          },
          "&.Mui-focused": {
            boxShadow: "0 16px 55px rgba(124, 92, 255, 0.16)",
            transform: "translateY(-1px)",
          },
        },
        notchedOutline: { borderColor: "rgba(255,255,255,0.12)" },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          border: "1px solid rgba(255,255,255,0.10)",
        },
      },
    },
  },
});

export default theme;
