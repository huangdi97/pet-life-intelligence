/**
 * usePetTwin — fetch the active individual twin descriptor for a pet.
 *
 * R2P3D-R1: the backend stores a twin_descriptor (family/morph/texture/surface)
 * in the active visual model's artifact_map. When present, the 3D stage builds
 * THAT pet's candidate; when absent (no verified twin yet), screens keep the
 * demo/photo fallback. Graceful by design — the twin is never a hard dependency.
 */
import { useCallback, useEffect, useState } from "react";
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

export function usePetTwin(petId: string | null): {
  twin: ActiveTwin | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
} {
  const [twin, setTwin] = useState<ActiveTwin | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!petId) return;
    setLoading(true);
    setError(false);
    api
      .get<{ models: Array<Record<string, unknown>> }>(`/pets/${petId}/visual-models`)
      .then((r) => {
        const active = (r.models ?? []).find((m) => m.status === "ACTIVE");
        if (!active) {
          setTwin(null);
          return;
        }
        const artifactMap = (active.artifact_map ?? {}) as {
          twin_descriptor?: TwinDescriptor;
        };
        const meta = (active.metadata_json ?? {}) as {
          demo_fixture?: boolean;
          media_provenance?: string;
          opts?: { media_provenance?: string };
        };
        const descriptor = artifactMap.twin_descriptor;
        // An ACTIVE row without a Twin descriptor is a legacy/incomplete
        // record, not permission to synthesize a generic dog and present it
        // as this pet. Fall back to the honest photo/2.5D path instead.
        if (!descriptor) {
          setTwin(null);
          return;
        }
        const surface = (descriptor as { surface?: { coverage_ratio?: number; observed_regions?: string[] } }).surface;
        setTwin({
          version: Number(active.version ?? 0),
          descriptor,
          coverageRatio: surface?.coverage_ratio ?? 0,
          observedRegions: surface?.observed_regions ?? [],
          mediaProvenance: meta.media_provenance ?? meta.opts?.media_provenance ?? "NOT_YET_OBSERVED",
          demoFixture: meta.demo_fixture === true,
          activatedAt: (active.activated_at as string | null) ?? null,
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [petId]);

  useEffect(() => {
    load();
  }, [load]);

  return { twin, loading, error, reload: load };
}