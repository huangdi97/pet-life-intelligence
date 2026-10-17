import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useAsync } from "../lib/hooks";

let element: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;
afterEach(async () => {
  if (root) await act(async () => { root?.unmount(); });
  element?.remove();
  root = null;
  element = null;
});

describe("cross-pet asynchronous provenance", () => {
  it("never renders the previous pet's fetched facts as the newly selected pet", async () => {
    const resolve: Record<string, (value: string) => void> = {};
    const renders: Array<{ selected: string; data: string | null }> = [];
    function Probe({ selected }: { selected: string }) {
      const query = useAsync(() => new Promise<string>(done => { resolve[selected] = done; }), [selected]);
      renders.push({ selected, data: query.data });
      return <div>{query.data ?? query.state}</div>;
    }
    element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);
    await act(async () => { root?.render(<Probe selected="pet-doudou" />); });
    await act(async () => { resolve["pet-doudou"]("doudou-facts"); });
    expect(element.textContent).toBe("doudou-facts");
    await act(async () => { root?.render(<Probe selected="pet-mimi" />); });
    expect(renders.filter(r => r.selected === "pet-mimi").every(r => r.data !== "doudou-facts")).toBe(true);
    expect(element.textContent).toBe("loading");
    await act(async () => { resolve["pet-mimi"]("mimi-facts"); });
    expect(element.textContent).toBe("mimi-facts");
  });
});
