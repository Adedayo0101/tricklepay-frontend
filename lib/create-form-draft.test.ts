/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FormDraft } from "@/types/form";

import { clearFormDraft, readFormDraft, writeFormDraft } from "./create-form-draft";

// Node 25 exposes a built-in localStorage that conflicts with jsdom's
// implementation. Provide a working in-memory substitute so the draft
// functions behave the same way they do in a real browser.
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

// A half-filled form as a user might leave it before a reload: some fields
// filled, the optional cliff still empty.
const HALF_FILLED_DRAFT: FormDraft = {
  recipient: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  token: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  amount: "12.5",
  start: "2026-08-27T10:00",
  end: "2026-08-27T12:00",
  cliff: "",
  durationAmount: "",
  durationUnit: "days",
};

describe("create-form-draft", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal("localStorage", storageMock);
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      writable: true,
      configurable: true,
    });
  });

  it("stores a draft and reads it back unchanged", () => {
    writeFormDraft(HALF_FILLED_DRAFT);

    expect(readFormDraft()).toEqual(HALF_FILLED_DRAFT);
  });

  it("clears the draft after a successful submission so stale values are not restored", () => {
    // The form persists the half-filled values while the user works...
    writeFormDraft(HALF_FILLED_DRAFT);
    expect(readFormDraft()).toEqual(HALF_FILLED_DRAFT);

    // ...and the successful-submission path clears it (see
    // useCreateStreamForm.handleConfirm -> clearFormDraft).
    clearFormDraft();

    expect(readFormDraft()).toBeNull();
  });
});
