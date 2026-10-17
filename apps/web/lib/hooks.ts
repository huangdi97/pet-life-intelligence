"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@pli/api-client";

export type LoadState = "loading" | "ready" | "error" | "denied";

export interface Async<T> {
  state: LoadState;
  data: T | null;
  error: Error | null;
  reload: () => void;
}
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  // React effects run AFTER render. Clearing data only within useEffect
  // otherwise exposes the previous pet's record during a pet-switch render.
  // Keep the provenance of the currently active request at render time.
  const requestIdentity = useRef<{ deps: unknown[]; tick: number } | null>(null);

  useEffect(() => {
    requestIdentity.current = { deps: [...deps], tick };
    let alive = true;
    setState("loading");
    setError(null);
    // Dependency changes often mean a different Pet ID. Keeping prior data
    // during that transition can briefly present the previous pet's facts or
    // Twin as the newly selected pet. Clear it until the new request resolves.
    setData(null);
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
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const source = requestIdentity.current;
  const belongsToCurrentRequest =
    source !== null &&
    source.tick === tick &&
    source.deps.length === deps.length &&
    deps.every((dep, i) => Object.is(dep, source.deps[i]));
  return belongsToCurrentRequest
    ? { state, data, error, reload }
    : { state: "loading", data: null, error: null, reload };
}

/** Current-pet context persisted across pages (GOAL Phase 10: 永远显示当前 Pet). */
export function useCurrentPet() {
  const [petId, setPetId] = useState<string | null>(null);

  const sync = useCallback(() => {
    setPetId(window.localStorage.getItem("pli_current_pet"));
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("pli-pet-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pli-pet-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

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
