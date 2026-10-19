/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TX_STAGE_LABELS } from "@/lib/contract-messages";

import { TransactionProgress } from "./transaction-progress";

// Text a screen reader gets from the live region: everything not hidden with
// aria-hidden, which leaves only the stage sentence.
function announced(region: HTMLElement): string {
  const clone = region.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
  return clone.textContent?.trim() ?? "";
}

describe("TransactionProgress live region", () => {
  it("announces only the current stage sentence, politely and atomically", () => {
    render(<TransactionProgress stage="signing" />);
    const region = screen.getByRole("status", { name: "Transaction progress" });

    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("true");
    expect(announced(region)).toBe(`Stage 2 of 4: ${TX_STAGE_LABELS.signing}`);
  });

  it("updates the announcement when the stage changes", () => {
    const { rerender } = render(<TransactionProgress stage="signing" />);
    rerender(<TransactionProgress stage="submitting" />);

    const region = screen.getByRole("status", { name: "Transaction progress" });
    expect(announced(region)).toBe(`Stage 3 of 4: ${TX_STAGE_LABELS.submitting}`);
  });

  it("does not change the region on a repeated render of the same stage", () => {
    const { rerender } = render(<TransactionProgress stage="confirming" />);
    const region = screen.getByRole("status", { name: "Transaction progress" });
    const before = region.innerHTML;

    rerender(<TransactionProgress stage="confirming" />);

    expect(screen.getByRole("status", { name: "Transaction progress" })).toBe(region);
    expect(region.innerHTML).toBe(before);
  });
});
