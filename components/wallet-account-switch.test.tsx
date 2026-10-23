/* @vitest-environment jsdom */

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StreamView } from "@/types/stream";

// Switching accounts in Freighter must carry the whole app to the new account
// in place: the address badge, the controls a stream offers (they depend on
// whether you are its sender or recipient) and both dashboard lists. This
// renders the real provider and consumers together and drives Freighter's
// account watcher by hand.

const ALICE = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const BOB = "GBBZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const CAROL = "GCCZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

type WatchCallback = (params: {
  address: string;
  network: string;
  networkPassphrase: string;
  error?: unknown;
}) => void;

// The watcher callbacks currently registered, i.e. the ones not yet stopped.
const watchers = vi.hoisted(() => new Set<{ cb: (p: never) => void }>());

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(async () => ({ isConnected: true })),
  isAllowed: vi.fn(async () => ({ isAllowed: true })),
  getAddress: vi.fn(async () => ({ address: ALICE })),
  getNetwork: vi.fn(async () => ({ network: "TESTNET", networkPassphrase: TESTNET_PASSPHRASE })),
  requestAccess: vi.fn(),
  WatchWalletChanges: class {
    private entry: { cb: (p: never) => void } | null = null;
    watch(cb: (p: never) => void) {
      this.entry = { cb };
      watchers.add(this.entry);
      return {};
    }
    stop() {
      if (this.entry) watchers.delete(this.entry);
    }
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Nothing here signs a transaction; stubbing the contract layer keeps the
// Stellar SDK's transaction machinery out of the test.
vi.mock("@/lib/contract", () => ({
  cancel: vi.fn(),
  withdraw: vi.fn(),
  withdrawAmount: vi.fn(),
  confirmTransaction: vi.fn(),
  TransactionTimeoutError: class extends Error {},
}));

const now = Math.floor(Date.now() / 1000);

function stream(id: string, sender: string, recipient: string): StreamView {
  return {
    id,
    sender,
    recipient,
    token: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
    totalAmount: "1000000000",
    withdrawn: "0",
    vested: "500000000",
    withdrawable: "500000000",
    locked: "500000000",
    startTime: String(now - 3600),
    endTime: String(now + 3600),
    cliffTime: String(now - 3600),
    cancelled: false,
    status: "streaming",
    progress: 5000,
  };
}

// Bob streams to Alice; Alice streams to Carol. So Alice has one incoming and
// one outgoing stream, while Bob has only the outgoing one he shares with her.
const BOB_TO_ALICE = stream("101", BOB, ALICE);
const ALICE_TO_CAROL = stream("202", ALICE, CAROL);
const ALL_STREAMS = [BOB_TO_ALICE, ALICE_TO_CAROL];

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  listStreams: vi.fn(async (params: { sender?: string; recipient?: string }) => {
    const streams = ALL_STREAMS.filter(
      (s) =>
        (params.sender === undefined || s.sender === params.sender) &&
        (params.recipient === undefined || s.recipient === params.recipient),
    );
    return { streams, total: streams.length, limit: 25, offset: 0 };
  }),
}));

import * as freighter from "@stellar/freighter-api";

import Home from "@/app/page";
import { StreamDetail } from "@/components/stream-detail";
import { WalletButton } from "@/components/wallet-button";
import { WalletProvider } from "@/components/wallet-provider";
import { listStreams } from "@/lib/api";
import { truncateAddress } from "@/lib/format";

function emitAccount(address: string) {
  act(() => {
    for (const { cb } of watchers) {
      (cb as WatchCallback)({ address, network: "TESTNET", networkPassphrase: TESTNET_PASSPHRASE });
    }
  });
}

function renderApp() {
  return render(
    <WalletProvider>
      <WalletButton />
      <Home />
      <StreamDetail stream={BOB_TO_ALICE} onComplete={() => {}} />
    </WalletProvider>,
  );
}

// The truncated address is not unique on the dashboard: every stream card shows
// its sender and recipient too. The badge is the authoritative "current
// account" indicator, so identify it by test id instead of by its text.
async function expectAddress(address: string) {
  await waitFor(() =>
    expect(screen.getByTestId("wallet-address").textContent).toBe(truncateAddress(address)),
  );
}

// Renders the app and waits for both the restored session and the account
// watcher. The watcher is registered from a passive effect, which can flush a
// tick after the badge first renders.
async function renderConnectedApp() {
  renderApp();
  await expectAddress(ALICE);
  await waitFor(() => expect(watchers.size).toBe(1));
}

describe("switching wallet accounts", () => {
  beforeEach(() => {
    watchers.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    watchers.clear();
  });

  it("starts watching for account changes once a session is restored", async () => {
    renderApp();
    await expectAddress(ALICE);
    await waitFor(() => expect(watchers.size).toBe(1));
  });

  it("moves the address, role-based controls and stream lists to the new account", async () => {
    await renderConnectedApp();

    // Alice: her address, the recipient's Withdraw control on Bob's stream,
    // and her own incoming (#101) and outgoing (#202) streams.
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel stream" })).toBeNull();
    await screen.findByText("#202");

    emitAccount(BOB);

    // The badge follows.
    await expectAddress(BOB);

    // Bob is the sender of the same stream, so he gets Cancel, not Withdraw.
    expect(screen.getByRole("button", { name: "Cancel stream" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Withdraw" })).toBeNull();

    // Both lists are refetched for Bob and re-rendered from his results.
    await waitFor(() => {
      expect(listStreams).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: BOB }),
        expect.anything(),
      );
      expect(listStreams).toHaveBeenCalledWith(
        expect.objectContaining({ sender: BOB }),
        expect.anything(),
      );
    });
    expect(await screen.findByText("No incoming streams.")).toBeTruthy();
    expect(await screen.findByText("#101")).toBeTruthy();
    expect(screen.queryByText("#202")).toBeNull();
  });

  it("follows the switch without a reload or a new connection prompt", async () => {
    await renderConnectedApp();

    emitAccount(BOB);
    await expectAddress(BOB);

    // The session was restored once on mount and never again: the switch came
    // from the watcher, not from remounting the provider or reconnecting.
    expect(freighter.getAddress).toHaveBeenCalledTimes(1);
    expect(freighter.requestAccess).not.toHaveBeenCalled();
  });

  it("ignores an empty address from a locked wallet", async () => {
    await renderConnectedApp();

    emitAccount("");

    expect(screen.getByTestId("wallet-address").textContent).toBe(truncateAddress(ALICE));
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeTruthy();
  });

  it("stops watching once the user disconnects", async () => {
    await renderConnectedApp();

    act(() => screen.getByRole("button", { name: /Disconnect wallet/ }).click());

    expect(watchers.size).toBe(0);
    expect(screen.queryByTestId("wallet-address")).toBeNull();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeTruthy();
  });
});
