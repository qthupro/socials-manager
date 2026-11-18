import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/app";

// Be Vietnam Pro, bundled locally so it works offline.
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
