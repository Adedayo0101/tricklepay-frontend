import { describe, expect, it, vi } from "vitest";

import { formatDuration, formatTokenAmount, formatTokenRate } from "@/lib/format";
import { NO_CLIFF_LABEL } from "@/lib/schedule";
import { vestingRatePerDay } from "@/lib/vesting";
import type { CreateStreamParams } from "@/types/contract";

import { StreamReview } from "./stream-review";

// A known token contract so formatTokenAmount/formatTokenRate resolve a
// symbol, the same way they do for a real stream.
const TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const PARAMS: CreateStreamParams = {
  sender: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  recipient: "GBBZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  token: TOKEN,
  totalAmount: 10_000_000n,
  startTime: 1_700_000_000n,
  endTime: 1_700_003_600n,
  cliffTime: 1_700_000_000n,
};

describe("StreamReview", () => {
  it("displays the exact values that will be submitted on confirm", () => {
    const el = StreamReview({
      params: PARAMS,
      feeEstimate: { status: "unavailable" },
      balanceCheck: { status: "unavailable" },
      submitting: false,
      onBack: vi.fn(),
      onConfirm: vi.fn(),
    });
    const json = JSON.stringify(el);

    expect(json).toContain(PARAMS.sender);
    expect(json).toContain(PARAMS.recipient);
    expect(json).toContain(PARAMS.token);
    expect(json).toContain(formatTokenAmount(PARAMS.totalAmount.toString(), PARAMS.token));
    expect(json).toContain(
      formatTokenRate(
        vestingRatePerDay(PARAMS.totalAmount, PARAMS.startTime, PARAMS.endTime)!.toString(),
        PARAMS.token,
      ),
    );
    expect(json).toContain(formatDuration(PARAMS.endTime - PARAMS.startTime)!);
  });

  it("shows the no-cliff label when the params have no cliff", () => {
    const el = StreamReview({
      params: PARAMS,
      feeEstimate: { status: "unavailable" },
      balanceCheck: { status: "unavailable" },
      submitting: false,
      onBack: vi.fn(),
      onConfirm: vi.fn(),
    });
    expect(JSON.stringify(el)).toContain(NO_CLIFF_LABEL);
  });

  it("makes the confirm action available and wires it to onConfirm", () => {
    const onConfirm = vi.fn();
    const el = StreamReview({
      params: PARAMS,
      feeEstimate: { status: "unavailable" },
      balanceCheck: { status: "unavailable" },
      submitting: false,
      onBack: vi.fn(),
      onConfirm,
    });

    const [, actionsRow] = el.props.children;
    const [, confirmBtn] = actionsRow.props.children;

    expect(confirmBtn.type).toBe("button");
    expect(confirmBtn.props.disabled).toBe(false);

    confirmBtn.props.onClick();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables the confirm action while a submission is in flight", () => {
    const el = StreamReview({
      params: PARAMS,
      feeEstimate: { status: "unavailable" },
      balanceCheck: { status: "unavailable" },
      submitting: true,
      onBack: vi.fn(),
      onConfirm: vi.fn(),
    });

    const [, actionsRow] = el.props.children;
    const [, confirmBtn] = actionsRow.props.children;

    expect(confirmBtn.props.disabled).toBe(true);
  });

  it("compares the balance with the amount and shows the shortfall", () => {
    // Hold 6, stream needs 10: short by 4.
    const el = StreamReview({
      params: PARAMS,
      feeEstimate: { status: "unavailable" },
      balanceCheck: { status: "ready", balance: 6_000_000n, shortfall: 4_000_000n },
      submitting: false,
      onBack: vi.fn(),
      onConfirm: vi.fn(),
    });
    const json = JSON.stringify(el);

    expect(json).toContain(formatTokenAmount("6000000", PARAMS.token));
    expect(json).toContain("You hold");
    expect(json).toContain("needs");
    expect(json).toContain(formatTokenAmount("4000000", PARAMS.token));
  });

  it("shows no shortfall warning when the balance covers the amount", () => {
    const el = StreamReview({
      params: PARAMS,
      feeEstimate: { status: "unavailable" },
      balanceCheck: { status: "ready", balance: 10_000_000n, shortfall: null },
      submitting: false,
      onBack: vi.fn(),
      onConfirm: vi.fn(),
    });

    expect(JSON.stringify(el)).not.toContain("You hold");
  });

  it("reports an unreadable balance without blocking confirm", () => {
    const el = StreamReview({
      params: PARAMS,
      feeEstimate: { status: "unavailable" },
      balanceCheck: { status: "unavailable" },
      submitting: false,
      onBack: vi.fn(),
      onConfirm: vi.fn(),
    });

    expect(JSON.stringify(el)).toContain("Could not read");
  });
});
