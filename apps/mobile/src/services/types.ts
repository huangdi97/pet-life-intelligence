/** Canonical shared types for mobile client (mirror of API DTOs).
 *  Field-for-field mirror of the canonical event schema. No per-client field
 *  inventions. */

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

export interface Task {
  id: string;
  pet_id: string;
  title: string;
  task_type: string;
  due_at: string | null;
  repeat_rule: string;
  assignee_user_id: string | null;
  status: string;
  completed_by_user_id: string | null;
  completed_at: string | null;
  completion_note: string;
  conflict_count: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  pet_id: string | null;
  created_at: string;
  read_at: string | null;
  data: Record<string, unknown>;
}

export interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface DeviceRow {
  device_id: string;
  provider: string;
  display_name: string;
  status: string;
}
