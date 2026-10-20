import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TricklePay",
    short_name: "TricklePay",
    description:
      "Stream token payments on Stellar in real time — create, manage, and withdraw from vesting streams without leaving your browser.",
    start_url: "/",
    display: "standalone",
    // background_color is shown while the app is loading (splash screen).
    // Matches the dark theme page background: neutral-950 = #0a0a0a.
    background_color: "#0a0a0a",
    // theme_color tints the browser UI chrome when installed.
    // Same as the dark theme-color meta tag in layout.tsx.
    theme_color: "#0a0a0a",
    icons: [
      {
        // apple-icon.png is 180×180 — suitable as a general-purpose icon.
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        // opengraph-image.png doubles as a large maskable icon for Android
        // home-screen installs (1200×630 is larger than the required 512×512).
        src: "/opengraph-image.png",
        sizes: "1200x630",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
