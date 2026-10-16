/* @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CreateFormRefs } from "@/hooks/use-create-stream-form";

import { CreateStreamFields } from "./create-stream-fields";

describe("CreateStreamFields", () => {
  const defaultProps = {
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
    previewRate: null,
    previewDuration: null,
    feedback: null,
    submitting: false,
    submitDisabled: false,
    onSubmit: vi.fn(),
  };

  it("renders every expected field", () => {
    const element = CreateStreamFields(defaultProps);
    const renderedOutput = JSON.stringify(element);

    expect(renderedOutput).toContain("Recipient address");
    expect(renderedOutput).toContain("Token contract id");
    expect(renderedOutput).toContain("Amount");
    expect(renderedOutput).toContain("Start");
    expect(renderedOutput).toContain("End");
    // We expect the cliff field to be present
    expect(renderedOutput).toContain("Cliff");
  });

  // DurationField is a child component CreateStreamFields doesn't invoke
  // itself — calling CreateStreamFields as a plain function (as the tests
  // above do) leaves it as an unexpanded element, so its own rendered text
  // never reaches that JSON. A real render is needed to see it.
  describe("the duration shortcut", () => {
    it("is present, labelled, and disabled until a start time is entered", () => {
      render(<CreateStreamFields {...defaultProps} />);

      // getByText/getByPlaceholderText/getByLabelText already throw if the
      // element isn't in the document, so finding them is itself the
      // presence assertion — no jest-dom matcher needed.
      expect(screen.getByText("Duration (optional)")).toBeTruthy();
      expect(screen.getByText("Fill in Start to use this.")).toBeTruthy();
      expect(screen.getByPlaceholderText("30").hasAttribute("disabled")).toBe(true);
      expect(screen.getByLabelText("Duration unit").hasAttribute("disabled")).toBe(true);
    });

    it("is enabled once a start time is entered", () => {
      render(
        <CreateStreamFields
          {...defaultProps}
          values={{ ...defaultProps.values, start: "2026-08-27T10:00" }}
        />,
      );

      expect(screen.getByText(/Sets End from Start/)).toBeTruthy();
      expect(screen.getByPlaceholderText("30").hasAttribute("disabled")).toBe(false);
      expect(screen.getByLabelText("Duration unit").hasAttribute("disabled")).toBe(false);
    });
  });

  it("marks the cliff field specifically as optional", () => {
    const element = CreateStreamFields(defaultProps);
    const renderedOutput = JSON.stringify(element);

    // Assert the optional indicator is present on the cliff field
    expect(renderedOutput).toContain("Cliff (optional)");
    
    // Assert required fields do NOT have the optional indicator
    expect(renderedOutput).not.toContain("Recipient address (optional)");
    expect(renderedOutput).not.toContain("Token contract id (optional)");
    expect(renderedOutput).not.toContain("Amount (optional)");
    expect(renderedOutput).not.toContain("Start (optional)");
    expect(renderedOutput).not.toContain("End (optional)");
  });

  describe('the "Use now" button', () => {
    it("sets start to the current time, rounded to the minute", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 7, 27, 10, 15, 32));

      const onFieldChange = vi.fn();
      render(<CreateStreamFields {...defaultProps} onFieldChange={onFieldChange} />);

      fireEvent.click(screen.getByRole("button", { name: "Set start to the current time" }));

      expect(onFieldChange).toHaveBeenCalledWith("start", "2026-08-27T10:15");

      vi.useRealTimers();
    });

    it("is offered only for the start field, not end or cliff", () => {
      render(<CreateStreamFields {...defaultProps} />);

      expect(screen.getAllByRole("button", { name: "Set start to the current time" })).toHaveLength(
        1,
      );
    });
  });

  describe("schedule presets", () => {
    it("renders the preset buttons and triggers onApplyPreset on click", () => {
      const onApplyPreset = vi.fn();
      render(<CreateStreamFields {...defaultProps} onApplyPreset={onApplyPreset} />);

      expect(screen.getByRole("group", { name: "Schedule presets" })).toBeTruthy();
      const monthBtn = screen.getByRole("button", { name: "1 month, linear" });
      const yearBtn = screen.getByRole("button", { name: "1 year, 3-month cliff" });
      const fourYearsBtn = screen.getByRole("button", { name: "4 years, 1-year cliff" });

      expect(monthBtn).toBeTruthy();
      expect(yearBtn).toBeTruthy();
      expect(fourYearsBtn).toBeTruthy();

      fireEvent.click(monthBtn);
      expect(onApplyPreset).toHaveBeenCalledWith("one-month-linear");

      fireEvent.click(yearBtn);
      expect(onApplyPreset).toHaveBeenCalledWith("one-year-three-month-cliff");
    });
  });
});
