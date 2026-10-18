/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearLastToken, LAST_TOKEN_STORAGE_KEY, readLastToken, writeLastToken } from "./last-token";

// Node 25 exposes a built-in localStorage that conflicts with jsdom's
// implementation. Provide a working in-memory substitute so the functions
// behave the same way they do in a real browser.
const store: Record<string, string> = {};

const storageMock = {
  getItem: vi.fn((key: string): string | null => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number): string | null => Object.keys(store)[index] ?? null),
};

const TOKEN = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
const RECIPIENT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";

describe("last-token", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal("localStorage", storageMock);
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      writable: true,
      configurable: true,
    });
  });

  it("stores a valid token and reads it back", () => {
    writeLastToken(TOKEN);

    expect(readLastToken()).toBe(TOKEN);
  });

  it("never stores an invalid value", () => {
    writeLastToken("not a contract");
    writeLastToken("");
    // A public key is a valid Stellar address but not a token contract.
    writeLastToken(RECIPIENT);

    expect(store[LAST_TOKEN_STORAGE_KEY]).toBeUndefined();
    expect(readLastToken()).toBeNull();
  });

  it("ignores an invalid value already in storage", () => {
    store[LAST_TOKEN_STORAGE_KEY] = "not a contract";

    expect(readLastToken()).toBeNull();
  });

  it("clears the remembered token", () => {
    writeLastToken(TOKEN);
    expect(readLastToken()).toBe(TOKEN);

    clearLastToken();

    expect(readLastToken()).toBeNull();
  });
});
