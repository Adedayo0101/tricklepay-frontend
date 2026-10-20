import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT_DIR = path.resolve(__dirname, "..");
const SOURCE_DIRS = ["app", "components", "hooks", "lib", "types"];
const EXTRA_SOURCE_FILES = ["next.config.ts"];

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (
      entry.isFile() &&
      /\.(ts|tsx|mts|mjs|js|jsx)$/.test(entry.name) &&
      !/\.test\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export function extractPublicEnvVarsFromSource(sourceText: string): string[] {
  const matches = new Set<string>();
  const pattern = /\b(?:process\.)?env\.(NEXT_PUBLIC_[A-Z0-9_]+)\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sourceText)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

export function extractDocumentedEnvVars(envExampleText: string): Set<string> {
  const documented = new Set<string>();
  const pattern = /^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(envExampleText)) !== null) {
    documented.add(match[1]);
  }
  return documented;
}

export function assertPublicEnvVarsDocumented(
  usedVars: Iterable<string>,
  envExampleText: string,
): void {
  const documented = extractDocumentedEnvVars(envExampleText);
  const missing = Array.from(new Set(usedVars))
    .filter((name) => !documented.has(name))
    .sort();

  if (missing.length > 0) {
    throw new Error(
      `Public environment variable(s) missing from .env.example: ${missing.join(", ")}`,
    );
  }
}

function scanRepoPublicEnvVars(): Set<string> {
  const files = [
    ...SOURCE_DIRS.flatMap((dir) => collectSourceFiles(path.join(ROOT_DIR, dir))),
    ...EXTRA_SOURCE_FILES.map((file) => path.join(ROOT_DIR, file)).filter((file) =>
      fs.existsSync(file),
    ),
  ];

  const vars = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const name of extractPublicEnvVarsFromSource(content)) {
      vars.add(name);
    }
  }
  return vars;
}

describe("public environment variables in .env.example", () => {
  it("extracts every NEXT_PUBLIC_ variable the code reads", () => {
    const usedVars = scanRepoPublicEnvVars();
    expect(usedVars).toContain("NEXT_PUBLIC_API_URL");
    expect(usedVars).toContain("NEXT_PUBLIC_API_TIMEOUT_MS");
    expect(usedVars).toContain("NEXT_PUBLIC_NETWORK");
    expect(usedVars).toContain("NEXT_PUBLIC_RPC_URL");
    expect(usedVars).toContain("NEXT_PUBLIC_CONTRACT_ID");
    expect(usedVars).toContain("NEXT_PUBLIC_APP_URL");
    expect(usedVars).toContain("NEXT_PUBLIC_MOCK_API");
  });

  it("fails naming any NEXT_PUBLIC_ variable absent from .env.example", () => {
    const usedVars = scanRepoPublicEnvVars();
    const envExamplePath = path.join(ROOT_DIR, ".env.example");
    const envExampleWithoutAppUrl = fs
      .readFileSync(envExamplePath, "utf8")
      .replace(/^\s*NEXT_PUBLIC_APP_URL\s*=.*$/m, "");

    expect(() => assertPublicEnvVarsDocumented(usedVars, envExampleWithoutAppUrl)).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });

  it("passes when every NEXT_PUBLIC_ variable read by the app is listed in .env.example", () => {
    const usedVars = scanRepoPublicEnvVars();
    const envExampleText = fs.readFileSync(path.join(ROOT_DIR, ".env.example"), "utf8");

    expect(() => assertPublicEnvVarsDocumented(usedVars, envExampleText)).not.toThrow();
  });
});
