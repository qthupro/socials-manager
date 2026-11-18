import { createHashRouter } from "react-router";

import { features } from "./features";
import { AppLayout } from "./layout/app-layout";

// Hash routing: the bundled app is served from a custom protocol with no
// server-side fallback, so URLs must not depend on the server resolving paths.
export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    // Shown while the first lazy feature route loads (replace with a spinner if wanted).
    HydrateFallback: () => null,
    children: features.flatMap((f) => f.routes),
  },
]);
