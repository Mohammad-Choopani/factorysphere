import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";

// If you are using MUI theme provider in your project, keep it.
// Otherwise you can remove these imports safely.
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme/theme";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
