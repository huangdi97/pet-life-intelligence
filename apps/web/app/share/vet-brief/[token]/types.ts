export interface SharePetInfo {
  name: string;
  species: string;
  breed: string;
  sex: string;
  birth_date: string;
  neutered: boolean | null;
  weight_note: string;
}

export interface KeyFinding {
  kind: string;
  text: string;
  observed_at: string;
}

export interface TriageHistoryItem {
  level: string;
  engine: string;
  version: string;
  matched_rules: string[];
  assessed_at: string;
}

export interface Medication {
  medicine_name: string;
  dose_text: string;
  route: string;
  frequency_text: string;
  source_type: string;
}

export interface ShareContent {
  pet: SharePetInfo;
  chief_complaint: string;
  onset_at: string | null;
  duration_text: string;
  eating: string;
  drinking: string;
  elimination: string;
  activity: string;
  current_meds_text: string;
  relevant_history_text: string;
  owner_notes: string;
  key_findings: KeyFinding[];
  red_flags: string[];
  triage_history: TriageHistoryItem[];
  active_medications: Medication[];
  ai_narrative_draft: string;
  ai_disclaimer: string;
  engine_versions: {
    rule_engine: string;
    ai_gateway_prompt: string;
    ai_model: string;
  };
  generated_at: string;
  notice: string;
}