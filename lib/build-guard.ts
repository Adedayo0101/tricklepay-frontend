// Build-time guard for NEXT_PUBLIC_CONTRACT_ID, called from next.config.ts.
//
// lib/config.ts skips its missing-id check while `next build` prerenders, so
// the build itself can complete. But NEXT_PUBLIC_* values are inlined at build
// time: a bundle built without the id carries an empty one and throws on load
// in every browser. Failing the build here moves that mistake from "found after
// deployment" to "found before anything ships".
//
// Imports nothing, so next.config.ts can load it without pulling in the app.

type Env = Record<string, string | undefined>;

export function assertContractIdForBuild(env: Env = process.env): void {
  // Mock mode substitutes a placeholder id (see lib/config.ts), so it boots
  // without a deployment.
  if (env.NEXT_PUBLIC_MOCK_API === "true") return;
  if (env.NEXT_PUBLIC_CONTRACT_ID && env.NEXT_PUBLIC_CONTRACT_ID.trim() !== "") return;

  throw new Error(
    "Build failed: NEXT_PUBLIC_CONTRACT_ID is not set. It is inlined into the " +
    "client bundle at build time, so a build without it would throw in every " +
    "browser. Set it to your deployed stream contract id (it starts with C) in " +
    ".env.local or the build environment, or set NEXT_PUBLIC_MOCK_API=true to " +
    "build against fixture data.",
  );
}
