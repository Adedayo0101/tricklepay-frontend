/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  isPageSize,
  MAX_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  PAGE_SIZE_STORAGE_KEY,
  readPageSize,
  writePageSize,
} from "./page-size";

// Node 25 exposes a built-in localStorage that conflicts with jsdom's
// implementation. Provide a working in-memory substitute so these functions
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

describe("isPageSize", () => {
  it("accepts every offered option", () => {
    for (const option of PAGE_SIZE_OPTIONS) {
      expect(isPageSize(option)).toBe(true);
    }
  });

  it("rejects values above the API ceiling", () => {
    expect(isPageSize(MAX_PAGE_SIZE + 1)).toBe(false);
    expect(isPageSize(200)).toBe(false);
  });

  it("rejects values that are not one of the offered options", () => {
    expect(isPageSize(0)).toBe(false);
    expect(isPageSize(30)).toBe(false);
  });
});

describe("readPageSize / writePageSize", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal("localStorage", storageMock);
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      writable: true,
      configurable: true,
    });
  });

  it("falls back to the default when nothing is stored", () => {
    expect(readPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });

  it("stores a choice and restores it", () => {
    writePageSize(50);
    expect(readPageSize()).toBe(50);
  });

  it("falls back to the default when the stored value is not a valid option", () => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, "9001");
    expect(readPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });

  it("falls back to the default when the stored value is not a number", () => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, "not-a-number");
    expect(readPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });
});
