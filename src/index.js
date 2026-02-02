import React from "react";
import ReactDOM from "react-dom/client";

import "./theme/globals.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// ✅ PWA Service Worker
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA install
serviceWorkerRegistration.register();

// Optional performance reporting
reportWebVitals();
