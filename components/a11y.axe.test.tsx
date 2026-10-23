/* @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CreateFormRefs } from "@/hooks/use-create-stream-form";
import { axeViolations } from "@/test/axe";

import { CreateStreamFields } from "./create-stream-fields";
import { StreamStatusLegend } from "./stream-status-legend";
import { TransactionProgress } from "./transaction-progress";

const createFieldsProps = {
  values: {
    recipient: "",
    token: "",
    amount: "",
    start: "",
    end: "",
    cliff: "",
    durationAmount: "",
    durationUnit: "days",
  },
  errors: {},
  refs: {
    recipient: { current: null },
    token: { current: null },
    amount: { current: null },
    start: { current: null },
    end: { current: null },
    cliff: { current: null },
    durationAmount: { current: null },
  } as CreateFormRefs,
  onFieldChange: vi.fn(),
  onApplyPreset: vi.fn(),
  rememberedToken: null,
  onClearRememberedToken: vi.fn(),
  walletAddress: null,
  previewRate: null,
  previewDuration: null,
  feedback: null,
  submitting: false,
  submitDisabled: false,
  onSubmit: vi.fn(),
};

describe("axe accessibility checks", () => {
  it("create stream form fields have no violations", async () => {
    const { container } = render(<CreateStreamFields {...createFieldsProps} />);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("create stream form fields with errors have no violations", async () => {
    const { container } = render(
      <CreateStreamFields
        {...createFieldsProps}
        errors={{ recipient: "Enter a valid address.", amount: "Enter an amount." }}
      />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("transaction progress has no violations", async () => {
    const { container } = render(<TransactionProgress stage="submitting" />);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("dashboard status legend has no violations", async () => {
    const { container } = render(<StreamStatusLegend />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
