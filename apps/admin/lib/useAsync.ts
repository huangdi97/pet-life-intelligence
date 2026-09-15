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
        if (e instanceof ApiError && e.code === "PERMISSION_DENIED") setState("denied");
        else {
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