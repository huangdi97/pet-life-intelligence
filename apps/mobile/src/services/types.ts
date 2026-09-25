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
export interface BehaviorEventRow {
  behavior_event_id: string;
  occurred_at: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  duration_seconds: number | null;
  intensity: string;
  intensity_source: string;
  environment: string;
  owner_notes: string;
  artifact_ids: string[];
}

export interface TrainingGoalRow {
  goal_id: string;
  title: string;
  status: string;
  mastery_level: number;
  steps: Array<{ description: string; status: string }>;
  target_behavior: string;
}

export interface TrainingTools {
  tools: Array<{ name: string; use: string }>;
  banned_note: string;
}

export interface WelfareProfile {
  pet_id: string;
  profile?: {
    domains?: Record<string, unknown>;
    notes?: string | null;
    updated_at?: string | null;
  } | null;
}

export interface WelfareEvidence {
  observation_counts: Record<string, number>;
  sources: string[];
  notice?: string;
}

export interface SocialProfile {
  pet_id: string;
  profile?: {
    good_with_dogs?: string;
    good_with_cats?: string;
    good_with_kids?: string;
    good_with_strangers?: string;
    notes?: string;
  } | null;
}

export interface PetFriend {
  request_id: string;
  friend_pet_id: string;
  status: string;
}

export interface AskAnswer {
  question?: string;
  answer?: string;
  facts?: string[];
  inference?: string | null;
  citations?: Array<{ label?: string; event_id?: string } | string>;
  sources?: Array<{ label?: string; event_id?: string } | string>;
  uncertainty?: string | null;
  action?: string | null;
  sufficient?: boolean;
  detail?: string;
  note?: string;
  limited?: boolean;
  external_blocked?: boolean;
}

export interface AiStatus {
  provider?: string;
  real_provider?: boolean;
  status?: string;
}
