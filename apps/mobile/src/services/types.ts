/** Canonical shared types for mobile client (mirror of API DTOs). */

export interface Pet {
  id: string;
  household_id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  birth_date: string | null;
  neutered: boolean | null;
  weight_note: string;
  timezone: string;
  avatar_artifact_id: string | null;
  created_at: string;
}

export interface LifeEvent {
  event_id: string;
  pet_id: string;
  event_type: string;
  occurred_at: string;
  recorded_at: string;
  actor_id: string;
  actor_name?: string;
  source_type: string;
  source_ref: string | null;
  provenance_level: string;
  schema_version: string;
  payload: Record<string, unknown>;
  artifact_ids: string[];
  supersedes_event_id: string | null;
  retracted_at: string | null;
}