/** Canonical API types for the v0.1 frontend (PLI-211 contract mirror).
 *  Field-for-field mirror of packages/domain-schema/life_event.schema.json
 *  and the API responses; the frontend may not invent event payload fields. */

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

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  pet_id: string | null;
  created_at: string;
  read_at: string | null;
  data: Record<string, unknown>;
}

export interface Triage {
  level: string;
  engine: string;
  matched_rules: string[];
}

export interface TriageHistoryItem {
  id: string;
  level: string;
  engine: string;
  matched_rules: Array<{ rule_id: string; rule_version: string; matched_keywords?: string[]; triage?: string }>;
  version: string;
  assessed_at: string;
}

export interface Observation {
  id: string;
  kind: string;
  text: string;
  created_at: string;
}

export interface IntakeStep {
  question_id: string;
  question_text: string;
  answer_text: string;
  asked_by: string;
}

export interface HealthEventDetail {
  health_event_id: string;
  pet_id: string;
  status: string;
  chief_complaint: string;
  onset_at: string | null;
  eating: string;
  drinking: string;
  elimination: string;
  activity: string;
  current_meds_text: string;
  relevant_history_text: string;
  owner_notes: string;
  latest_triage_level: string | null;
  triage_history: TriageHistoryItem[];
  observations: Observation[];
  intake_steps: IntakeStep[];
  vet_briefs: string[];
  outcomes: Array<{ outcome: string; notes: string; recorded_at: string }>;
}

export interface VetBriefContent {
  pet: Record<string, unknown>;
  chief_complaint: string;
  key_findings: Array<{ kind: string; text: string; observed_at: string }>;
  triage_history: Array<{ level: string; engine: string; version: string; matched_rules: string[]; assessed_at: string }>;
  active_medications: Array<Record<string, string>>;
  ai_narrative_draft: string;
  ai_disclaimer: string;
  engine_versions: Record<string, string>;
  generated_at: string;
  notice: string;
  red_flags: string[];
  [key: string]: unknown;
}

export interface MedicationDose {
  dose_id: string;
  planned_at: string;
  status: string;
  given_at: string | null;
  given_by: string | null;
}

export interface MedicationPlan {
  plan_id: string;
  medicine_name: string;
  dose_text: string;
  route: string;
  frequency_text: string;
  status: string;
  source_type: string;
  source_note: string;
  start_date: string;
  end_date: string | null;
  doses: MedicationDose[];
}

export interface BehaviorEvent {
  behavior_event_id: string;
  occurred_at: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  duration_seconds: number | null;
  intensity: string;
  intensity_source: string;
  environment: string;
  artifact_ids: string[];
}

export interface Grant {
  grant_id: string;
  user_id: string;
  scopes: string[];
  reason: string;
  source: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface HouseholdMemberRow {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
}

export interface Consent {
  purpose: string;
  granted: boolean;
  updated_at: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; request_id: string; details?: Record<string, unknown> };
}
