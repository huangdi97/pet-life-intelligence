"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@pli/api-client";

export type LoadState = "loading" | "ready" | "error" | "denied";

export interface Async<T> {
  state: LoadState;
  data: T | null;
  error: string | null;
  reload: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState("loading");
    setError(null);
    fn()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && e.code === "PERMISSION_DENIED") {
          setState("denied");
        } else {
          setState("error");
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { state, data, error, reload };
}

/** Current-pet context persisted across pages (GOAL Phase 10: 永远显示当前 Pet). */
export function useCurrentPet() {
  const [petId, setPetId] = useState<string | null>(null);
  useEffect(() => {
    setPetId(window.localStorage.getItem("pli_current_pet"));
  }, []);
  const choose = useCallback((id: string) => {
    window.localStorage.setItem("pli_current_pet", id);
    setPetId(id);
    window.dispatchEvent(new Event("pli-pet-changed"));
  }, []);
  return { petId, choose };
}

export function fmtTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("zh-CN");
  } catch {
    return iso;
  }
}
