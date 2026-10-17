import type { Metadata } from "next";
import type { JSX } from "react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { OfflineBanner } from "@/components/offline-banner";
import { SkipLink } from "@/components/skip-link";
import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/components/wallet-provider";
import { THEME_STORAGE_KEY } from "@/lib/theme";

import "./globals.css";

// No hard-coded fallback domain: an unset NEXT_PUBLIC_APP_URL should not
// silently point canonical/social metadata at a URL we don't control.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// Applies the persisted (or OS-preferred) theme to <html> synchronously,
// before hydration, so there is no flash of the wrong theme on first paint.
//
// WHY THIS EXISTS
// React renders <html> on the server without the "light" class (dark is the
// default). If we applied the theme in a useEffect, the page would flash from
// dark to light for users who prefer light mode. An inline <script> in <head>
// runs synchronously during HTML parsing, before the browser paints anything,
// so the correct class is already present when the first frame is drawn.
//
// LOGIC (mirrors resolveInitialTheme in lib/theme.ts — keep in sync)
//   1. Read localStorage["trickle-theme"].
//   2. If the stored value is "light" or "dark", use it (explicit user choice).
//   3. Otherwise fall back to window.matchMedia("(prefers-color-scheme: light)").
//   4. If the resolved theme is light, add class="light" to <html>. Do nothing
//      for dark — it is already the default via `color-scheme: dark` in CSS.
//
// suppressHydrationWarning on <html> silences React's hydration mismatch
// warning: the server renders without "light"; the bootstrap may add it on the
// client before React hydrates, which is intentional and expected.
//
// This script is intentionally kept as a minified inline string. It must be a
// single synchronously-executed script with no imports; any async work or
// bundle dependency would defeat its purpose.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var light=s==="light"||s==="dark"?s==="light":window.matchMedia("(prefers-color-scheme: light)").matches;if(light)document.documentElement.classList.add("light");}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "Your streams — TricklePay",
    // Page-level titles render as "Page — TricklePay"
    template: "%s — TricklePay",
  },
  description:
    "TricklePay lets you stream token payments on Stellar in real time — create, manage, and withdraw from vesting streams without leaving your browser.",
  metadataBase: APP_URL ? new URL(APP_URL) : null,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "TricklePay",
    title: "TricklePay — Token streaming on Stellar",
    description:
      "Create and manage real-time token payment streams on the Stellar network. Cliff vesting, live accrual, and instant withdrawal — all non-custodial.",
    // app/opengraph-image.png is picked up automatically by Next.js's
    // file-based metadata convention. The explicit entry ensures the correct
    // dimensions and MIME type are advertised to social crawlers.
    // SVG is not reliably rendered by social platforms or iOS home screen —
    // the PNG replaces it as the canonical social image.
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "TricklePay — Token streaming on Stellar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TricklePay — Token streaming on Stellar",
    description:
      "Create and manage real-time token payment streams on the Stellar network. Cliff vesting, live accrual, and instant withdrawal — all non-custodial.",
    images: ["/opengraph-image.png"],
  },
  icons: {
    // app/icon.svg is kept for the browser tab favicon (SVG is supported by
    // all modern browsers for favicons). The Apple touch icon is switched to
    // PNG because iOS does not render SVG for home-screen icons.
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <ThemeProvider>
          <WalletProvider>
            <SkipLink />
            <Header />
            <OfflineBanner />
            {children}
            <Footer />
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
