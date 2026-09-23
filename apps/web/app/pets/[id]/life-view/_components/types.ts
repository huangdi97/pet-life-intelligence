export interface VisualStatus {
  provider: string;
  real: boolean;
  status: string;
}

export interface VisualModel {
  model_id: string;
  version: number;
  provider: string;
  status: string;
  failure_reason: string | null;
  owner_verified: boolean | null;
  identity_qc: { result?: string; issues?: string[] };
  provenance_kind: string;
  activated_at: string | null;
  retired_at: string | null;
  created_at: string;
}

export interface Manifest {
  pet_id: string;
  model_id: string;
  version: number;
  render_targets: { poster?: string; low?: string; interactive?: string; turntable?: string };
  lod_policy: { order: string[]; fallback?: string };
  fallback_policy: { primary?: string };
  freshness_checked_at: string;
}

export interface OverlayMetric {
  key: string;
  label: string;
  current: string | number;
  baseline_range: string | null;
  delta: number | null;
  freshness: string;
  source: string;
}

export interface StateOverlay {
  pet_id: string;
  provenance_kind: string;
  provider_real: boolean;
  model_status: string | null;
  metrics: OverlayMetric[];
  note: string;
}

export interface PetRow {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
}
