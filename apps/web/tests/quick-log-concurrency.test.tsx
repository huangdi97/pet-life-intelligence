import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuickLogSheet } from "@pli/ui-kit";

describe("Quick Log write integrity", () => {
  it("allows only one event POST while a double tap is pending", async () => {
    let complete: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { complete = resolve; });
    const post = vi.fn(() => pending);
    render(<QuickLogSheet open onClose={vi.fn()} types={[{ type: "daily.meal", label: "喂食" }]} onQuickLog={post} />);
    const button = screen.getByTestId("pli.quicklog.tile.feed") as HTMLButtonElement;
    fireEvent.click(button);
    fireEvent.click(button);
    expect(post).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    complete?.();
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it("retains entered diary text when the server rejects a save", async () => {
    const post = vi.fn().mockRejectedValueOnce(new Error("NETWORK")).mockResolvedValueOnce(undefined);
    render(<QuickLogSheet open onClose={vi.fn()} types={[{
      type: "diary.created", label: "日记",
      textInput: { label: "记录内容" },
    }]} onQuickLog={post} />);
    fireEvent.click(screen.getByText("日记"));
    const entry = screen.getByTestId("pli.quicklog.text-input") as HTMLTextAreaElement;
    fireEvent.change(entry, { target: { value: "和豆豆一起散步" } });
    const save = screen.getByTestId("pli.quicklog.text-save");
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByTestId("pli.quicklog.save-error")).toBeTruthy());
    expect(post).toHaveBeenCalledTimes(1);
    expect(entry.value).toBe("和豆豆一起散步");
    fireEvent.click(save);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  });
});
