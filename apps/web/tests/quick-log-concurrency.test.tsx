import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { fireEvent } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickLogSheet } from "@pli/ui-kit";

// DOM-only testing-library avoids importing a second React type namespace
// into Web's declared React 19 compilation graph.
let root: ReturnType<typeof createRoot> | null = null;
let element: HTMLDivElement | null = null;
async function mount(children: React.ReactNode) {
  element = document.createElement("div");
  document.body.appendChild(element);
  root = createRoot(element);
  await act(async () => { root?.render(children); });
  return element;
}
afterEach(async () => {
  if (root) await act(async () => { root?.unmount(); });
  element?.remove();
  root = null;
  element = null;
});

describe("Quick Log write integrity", () => {
  it("blocks duplicate taps until the same request completes", async () => {
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const post = vi.fn(() => pending);
    const div = await mount(<QuickLogSheet open onClose={vi.fn()} types={[
      { type: "daily.meal", label: "喂食" },
    ]} onQuickLog={post} />);
    const button = div.querySelector('[data-testid="pli.quicklog.tile.feed"]') as HTMLButtonElement;
    await act(async () => { fireEvent.click(button); fireEvent.click(button); });
    expect(post).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    await act(async () => { finish?.(); await pending; });
    expect(button.disabled).toBe(false);
  });

  it("keeps a rejected diary and permits a deliberate retry", async () => {
    const post = vi.fn().mockRejectedValueOnce(new Error("NETWORK")).mockResolvedValueOnce(undefined);
    const div = await mount(<QuickLogSheet open onClose={vi.fn()} types={[
      { type: "diary.created", label: "日记", textInput: { label: "记录内容" } },
    ]} onQuickLog={post} />);
    await act(async () => {
      fireEvent.click(div.querySelector('[data-testid="pli.quicklog.tile.diary.created"]') as HTMLElement);
    });
    const entry = div.querySelector('[data-testid="pli.quicklog.text-input"]') as HTMLTextAreaElement;
    await act(async () => { fireEvent.change(entry, { target: { value: "和豆豆一起散步" } }); });
    const save = div.querySelector('[data-testid="pli.quicklog.text-save"]') as HTMLElement;
    await act(async () => { fireEvent.click(save); fireEvent.click(save); });
    expect(post).toHaveBeenCalledTimes(1);
    expect(div.querySelector('[data-testid="pli.quicklog.save-error"]')).not.toBeNull();
    expect(entry.value).toBe("和豆豆一起散步");
    await act(async () => { fireEvent.click(save); });
    expect(post).toHaveBeenCalledTimes(2);
  });
});
