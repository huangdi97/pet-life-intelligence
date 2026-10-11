/**
 * usePetTwin — fetch the active individual twin descriptor for a pet.
 *
 * R2P3D-R1: the backend stores a twin_descriptor (family/morph/texture/surface)
 * in the active visual model's artifact_map. When present, the 3D stage builds
 * THAT pet's candidate; when absent (no verified twin yet), screens keep the
 * demo/photo fallback. Graceful by design — the twin is never a hard dependency.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TwinDescriptor } from "@pli/pet-3d";
import { api } from "../api";

export interface ActiveTwin {
  version: number;
  descriptor: TwinDescriptor;
  coverageRatio: number;
  observedRegions: string[];
  /** "DEMO_TEMPLATE" | "DEMO_SYNTHETIC" | "OWNER_REPORTED" | "NOT_YET_OBSERVED" */
  mediaProvenance: string;
  /** Bundled product-demo Twin, never a real-pet identity claim. */
  demoFixture: boolean;
  activatedAt: string | null;
}

interface ScopedTwinResult {
  petId: string;
  twin: ActiveTwin | null;
  loading: boolean;
  error: boolean;
}

/** An ACTIVE visual model is only a candidate if it has a persisted descriptor. */
function activeTwinFromResponse(r: { models: Array<Record<string, unknown>> }): ActiveTwin | null {
  const active = (r.models ?? []).find((model) => model.status === "ACTIVE");
  if (!active) return null;
  const artifactMap = (active.artifact_map ?? {}) as { twin_descriptor?: TwinDescriptor };
  const meta = (active.metadata_json ?? {}) as {
    demo_fixture?: boolean;
    media_provenance?: string;
    opts?: { media_provenance?: string };
  };
  const descriptor = artifactMap.twin_descriptor;
  if (!descriptor) return null;
  const surface = (descriptor as { surface?: { coverage_ratio?: number; observed_regions?: string[] } }).surface;
  return {
    version: Number(active.version ?? 0),
    descriptor,
    coverageRatio: surface?.coverage_ratio ?? 0,
    observedRegions: surface?.observed_regions ?? [],
    mediaProvenance: meta.media_provenance ?? meta.opts?.media_provenance ?? "NOT_YET_OBSERVED",
    demoFixture: meta.demo_fixture === true,
    activatedAt: (active.activated_at as string | null) ?? null,
  };
}

export function usePetTwin(petId: string | null): {
  twin: ActiveTwin | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
} {
  // Never let a prior pet's slow response overwrite the newly selected twin.
  // The scoped result also masks previous identity synchronously during render
  // (before useEffect cleanup runs), preventing a one-frame cross-pet leak.
  const [result, setResult] = useState<ScopedTwinResult | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(() => {
    const version = ++requestVersion.current;
    if (!petId) {
      setResult(null);
      return;
    }
    setResult({ petId, twin: null, loading: true, error: false });
    api.get<{ models: Array<Record<string, unknown>> }>(`/pets/${petId}/visual-models`)
      .then((response) => {
        if (requestVersion.current !== version) return;
        setResult({ petId, twin: activeTwinFromResponse(response), loading: false, error: false });
      })
      .catch(() => {
        if (requestVersion.current !== version) return;
        setResult({ petId, twin: null, loading: false, error: true });
      });
  }, [petId]);

  useEffect(() => {
    load();
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);

  const visible = result?.petId === petId ? result : null;
  return {
    twin: visible?.twin ?? null,
    loading: visible?.loading ?? !!petId,
    error: visible?.error ?? false,
    reload: load,
  };
}
