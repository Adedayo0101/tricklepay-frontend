/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";

// A test that only imports what it needs can't catch a file elsewhere in the
// tree that fails to parse. This dynamically imports every source module
// under app/, components/, hooks/, and lib/ so a broken file fails here,
// named, instead of going unnoticed until someone happens to import it.
const modules = import.meta.glob([
  "/app/**/*.ts",
  "/app/**/*.tsx",
  "/components/**/*.ts",
  "/components/**/*.tsx",
  "/hooks/**/*.ts",
  "/hooks/**/*.tsx",
  "/lib/**/*.ts",
  "/lib/**/*.tsx",
]);

const modulePaths = Object.keys(modules).filter(
  (path) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx") && !path.endsWith(".d.ts"),
);

describe("module smoke test", () => {
  it("found source modules to import", () => {
    expect(modulePaths.length).toBeGreaterThan(0);
  });

  for (const path of modulePaths) {
    // Generous timeout: this is catching parse/import errors, not measuring
    // speed, and some modules pull in heavy SDKs that are slow to transform
    // on a cold cache.
    it(
      `imports ${path}`,
      async () => {
        await expect(modules[path]()).resolves.toBeDefined();
      },
      20000,
    );
  }
});
