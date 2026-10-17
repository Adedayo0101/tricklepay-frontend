/* @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useOnline } from "./use-online";

function Consumer({ onRender }: { onRender: (online: boolean) => void }) {
  onRender(useOnline());
  return null;
}

describe("useOnline", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("returns true initially (navigator.onLine defaults to true in jsdom)", () => {
    const renders: boolean[] = [];
    act(() => {
      root.render(<Consumer onRender={(v) => renders.push(v)} />);
    });
    expect(renders.at(-1)).toBe(true);
  });

  it("returns false after an offline event fires", () => {
    const renders: boolean[] = [];
    act(() => {
      root.render(<Consumer onRender={(v) => renders.push(v)} />);
    });

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(renders.at(-1)).toBe(false);
  });

  it("returns true again after an online event fires", () => {
    const renders: boolean[] = [];
    act(() => {
      root.render(<Consumer onRender={(v) => renders.push(v)} />);
    });

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(renders.at(-1)).toBe(true);
  });

  it("removes event listeners on unmount", () => {
    const renders: boolean[] = [];
    act(() => {
      root.render(<Consumer onRender={(v) => renders.push(v)} />);
    });
    act(() => root.unmount());

    const lengthBefore = renders.length;
    // Dispatching after unmount should not trigger any additional renders.
    window.dispatchEvent(new Event("offline"));
    expect(renders.length).toBe(lengthBefore);
  });
});
