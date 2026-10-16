/* @vitest-environment jsdom */

import { useRouter } from "next/navigation";
import { act, type FormEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/wallet-provider", () => ({
  useWallet: vi.fn(),
}));

vi.mock("@/hooks/use-network-guard", () => ({
  useNetworkGuard: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

import { useWallet } from "@/components/wallet-provider";
import { useNetworkGuard } from "@/hooks/use-network-guard";

import { useCreateStreamForm, type CreateStreamForm } from "./use-create-stream-form";

const SENDER = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const RECIPIENT = "GDJ4UNJKLYMFOWELVDQJC2PEVRGIDSU7HCNW6ULYWJIXZOD7HBNOHHVJ";
const TOKEN = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

const DRAFT_STORAGE_KEY = "tricklepay-create-form-draft";

// Node 25 exposes a built-in localStorage that doesn't support setItem /
// getItem / removeItem without --localstorage-file. Provide an in-memory
// substitute so the draft functions behave the same as in a real browser.
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

function fakeSubmitEvent(): FormEvent {
  return { preventDefault: () => {} } as unknown as FormEvent;
}

describe("useCreateStreamForm", () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest!: CreateStreamForm;

  function Probe() {
    latest = useCreateStreamForm();
    return null;
  }

  async function renderForm() {
    await act(async () => {
      root.render(<Probe />);
    });
  }

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      writable: true,
      configurable: true,
    });

    vi.mocked(useWallet).mockReturnValue({
      address: SENDER,
      network: "testnet",
      connecting: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    vi.mocked(useNetworkGuard).mockReturnValue({
      mismatch: false,
      walletNetwork: "testnet",
      expectedNetwork: "testnet",
    });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<
      typeof useRouter
    >);

    // The end time is validated against the clock; pin it before the fixed
    // dates the tests enter. Date.now only, so React's real timers keep running.
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-08-27T09:00").getTime());

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("reports validation errors for bad input", async () => {
    await renderForm();

    // Empty form: every required field must be flagged and no review step shown.
    await act(async () => {
      await latest.handleSubmit(fakeSubmitEvent());
    });

    expect(latest.errors.recipient).toBe("Recipient address is required.");
    expect(latest.errors.token).toBe("Token contract id is required.");
    expect(latest.errors.amount).toBe("Amount is required.");
    expect(latest.errors.start).toBe("Start date is required.");
    expect(latest.errors.end).toBe("End date is required.");
    expect(latest.prepared).toBeNull();
  });

  it("reports a clean state for valid input", async () => {
    await renderForm();

    await act(async () => {
      latest.setField("recipient", RECIPIENT);
    });
    await act(async () => {
      latest.setField("token", TOKEN);
    });
    await act(async () => {
      latest.setField("amount", "12.5");
    });
    await act(async () => {
      latest.setField("start", "2026-08-27T10:00");
    });
    await act(async () => {
      latest.setField("end", "2026-08-27T12:00");
    });

    await act(async () => {
      await latest.handleSubmit(fakeSubmitEvent());
    });

    expect(latest.errors.recipient).toBeUndefined();
    expect(latest.errors.token).toBeUndefined();
    expect(latest.errors.amount).toBeUndefined();
    expect(latest.errors.start).toBeUndefined();
    expect(latest.errors.end).toBeUndefined();
    expect(latest.errors.cliff).toBeUndefined();
    // Validation passed: the hook holds the exact params confirm will submit.
    expect(latest.prepared).not.toBeNull();
    expect(latest.prepared).toMatchObject({ sender: SENDER, recipient: RECIPIENT, token: TOKEN });
  });

  it("round-trips amounts through the form and converts to base units", async () => {
    await renderForm();

    await act(async () => {
      latest.setField("recipient", RECIPIENT);
    });
    await act(async () => {
      latest.setField("token", TOKEN);
    });
    await act(async () => {
      latest.setField("amount", "12.5");
    });
    await act(async () => {
      latest.setField("start", "2026-08-27T10:00");
    });
    await act(async () => {
      latest.setField("end", "2026-08-27T12:00");
    });

    await act(async () => {
      await latest.handleSubmit(fakeSubmitEvent());
    });

    // A test asserts the displayed value matches what was entered
    expect(latest.values.amount).toBe("12.5");

    // A test asserts a decimal amount converts to the expected base units (7 decimals)
    expect(latest.prepared?.totalAmount).toBe(125000000n);
  });

  it("arms the beforeunload listener when a draft is restored", async () => {
    // Seed a draft so the form restores it on mount.
    store[DRAFT_STORAGE_KEY] = JSON.stringify({
      recipient: RECIPIENT,
      token: TOKEN,
      amount: "5",
      start: "",
      end: "",
      cliff: "",
    });

    const addSpy = vi.spyOn(window, "addEventListener");

    await renderForm();

    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([type]) => type === "beforeunload",
    );
    expect(beforeUnloadCalls.length).toBeGreaterThan(0);

    // The message should explain the draft is safe.
    const handler = beforeUnloadCalls[0][1] as (e: BeforeUnloadEvent) => void;
    const fakeEvent = { preventDefault: vi.fn(), returnValue: "" } as unknown as BeforeUnloadEvent;
    handler(fakeEvent);
    expect(fakeEvent.returnValue).toBe(
      "You have a restored draft. Your progress is saved and will be here when you return.",
    );

    addSpy.mockRestore();
  });

  it("does not prompt when the form is untouched and no draft exists", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    await renderForm();

    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([type]) => type === "beforeunload",
    );
    expect(beforeUnloadCalls).toHaveLength(0);

    addSpy.mockRestore();
  });
});
