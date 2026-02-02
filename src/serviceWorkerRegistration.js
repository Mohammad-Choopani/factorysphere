// CRA standard service worker registration
// Safe for Phase A (no aggressive caching)

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register() {
  if ("serviceWorker" in navigator) {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      checkValidServiceWorker(swUrl);
    } else {
      registerValidSW(swUrl);
    }
  }
}

function registerValidSW(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then(() => {
      console.log("Service Worker registered");
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

function checkValidServiceWorker(swUrl) {
  fetch(swUrl, { headers: { "Service-Worker": "script" } })
    .then((response) => {
      const contentType = response.headers.get("content-type");
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf("javascript") === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister();
        });
      } else {
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log("No internet connection found. App running in offline mode.");
    });
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
