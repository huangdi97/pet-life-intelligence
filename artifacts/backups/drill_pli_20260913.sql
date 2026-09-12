--
-- PostgreSQL database dump
--

\restrict VaHOudZoB0htbm0eLNaLZ6R5Qm7eSYc4gOFFy0J88mFm4C8WGeFyMR4QM3botz1

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg12+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg12+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_action_logs; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.agent_action_logs (
    pet_id uuid,
    action_class character varying(40) NOT NULL,
    proposal jsonb NOT NULL,
    policy_result character varying(30) NOT NULL,
    executed boolean NOT NULL,
    created_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.agent_action_logs OWNER TO pli;

--
-- Name: ai_inference_logs; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.ai_inference_logs (
    capability character varying(60) NOT NULL,
    provider character varying(40) NOT NULL,
    model character varying(80) NOT NULL,
    prompt_version character varying(20) NOT NULL,
    schema_version character varying(20) NOT NULL,
    trace_id character varying(64) NOT NULL,
    latency_ms integer NOT NULL,
    token_usage jsonb NOT NULL,
    safety_flags jsonb NOT NULL,
    fallback_used boolean NOT NULL,
    input_summary text NOT NULL,
    output_summary text NOT NULL,
    pet_id uuid,
    created_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.ai_inference_logs OWNER TO pli;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO pli;

--
-- Name: analytics_counters; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.analytics_counters (
    metric character varying(80) NOT NULL,
    day date NOT NULL,
    count integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.analytics_counters OWNER TO pli;

--
-- Name: artifacts; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.artifacts (
    pet_id uuid NOT NULL,
    kind character varying(20) NOT NULL,
    content_type character varying(120) NOT NULL,
    size_bytes integer NOT NULL,
    sha256 character varying(64) NOT NULL,
    storage_backend character varying(20) NOT NULL,
    storage_key character varying(200) NOT NULL,
    original_filename character varying(255) NOT NULL,
    sensitive boolean NOT NULL,
    created_by_user_id uuid NOT NULL,
    deleted_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.artifacts OWNER TO pli;

--
-- Name: audit_entries; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.audit_entries (
    occurred_at timestamp with time zone NOT NULL,
    actor_user_id uuid,
    household_id uuid,
    pet_id uuid,
    action character varying(60) NOT NULL,
    resource_type character varying(60) NOT NULL,
    resource_id character varying(64) NOT NULL,
    detail jsonb NOT NULL,
    request_id character varying(64) NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE public.audit_entries OWNER TO pli;

--
-- Name: automation_rules; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.automation_rules (
    pet_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    condition jsonb NOT NULL,
    action character varying(40) NOT NULL,
    requires_confirmation boolean NOT NULL,
    enabled boolean NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.automation_rules OWNER TO pli;

--
-- Name: baselines; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.baselines (
    pet_id uuid NOT NULL,
    metric character varying(40) NOT NULL,
    value character varying(40) NOT NULL,
    unit character varying(20) NOT NULL,
    sample_count integer NOT NULL,
    window_days integer NOT NULL,
    algorithm character varying(60) NOT NULL,
    computed_at timestamp with time zone NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.baselines OWNER TO pli;

--
-- Name: behavior_events; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.behavior_events (
    pet_id uuid NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    antecedent text NOT NULL,
    behavior text NOT NULL,
    consequence text NOT NULL,
    duration_seconds integer,
    intensity character varying(20) NOT NULL,
    intensity_source character varying(40) NOT NULL,
    people_involved character varying(300) NOT NULL,
    animals_involved character varying(300) NOT NULL,
    environment text NOT NULL,
    owner_notes text NOT NULL,
    artifact_ids jsonb NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.behavior_events OWNER TO pli;

--
-- Name: behavior_intervention_plans; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.behavior_intervention_plans (
    pet_id uuid NOT NULL,
    behavior_event_id uuid,
    title character varying(200) NOT NULL,
    approach character varying(40) NOT NULL,
    steps jsonb NOT NULL,
    outcomes jsonb NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.behavior_intervention_plans OWNER TO pli;

--
-- Name: care_cards; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.care_cards (
    pet_id uuid NOT NULL,
    content jsonb NOT NULL,
    issued_by_user_id uuid NOT NULL,
    expires_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.care_cards OWNER TO pli;

--
-- Name: care_handoffs; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.care_handoffs (
    pet_id uuid NOT NULL,
    caregiver_user_id uuid NOT NULL,
    owner_user_id uuid NOT NULL,
    scope jsonb NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone,
    status character varying(20) NOT NULL,
    grant_id uuid,
    notes text NOT NULL,
    ended_at timestamp with time zone,
    ended_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    checklist jsonb NOT NULL
);


ALTER TABLE public.care_handoffs OWNER TO pli;

--
-- Name: care_reminders; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.care_reminders (
    pet_id uuid NOT NULL,
    kind character varying(30) NOT NULL,
    title character varying(200) NOT NULL,
    due_date date NOT NULL,
    note character varying(300) NOT NULL,
    status character varying(20) NOT NULL,
    last_notified_at timestamp with time zone,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.care_reminders OWNER TO pli;

--
-- Name: care_tasks; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.care_tasks (
    pet_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    task_type character varying(30) NOT NULL,
    due_at timestamp with time zone,
    repeat_rule character varying(10) NOT NULL,
    assignee_user_id uuid,
    status character varying(20) NOT NULL,
    completed_by_user_id uuid,
    completed_at timestamp with time zone,
    completion_note text NOT NULL,
    created_by_user_id uuid NOT NULL,
    cancelled_at timestamp with time zone,
    conflict_count integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.care_tasks OWNER TO pli;

--
-- Name: clinical_intake_steps; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.clinical_intake_steps (
    health_event_id uuid NOT NULL,
    question_id character varying(80) NOT NULL,
    question_text text NOT NULL,
    answer_text text NOT NULL,
    asked_by character varying(10) NOT NULL,
    ai_inference_id uuid,
    answered_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.clinical_intake_steps OWNER TO pli;

--
-- Name: consents; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.consents (
    pet_id uuid NOT NULL,
    purpose character varying(60) NOT NULL,
    granted boolean NOT NULL,
    updated_by_user_id uuid NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE public.consents OWNER TO pli;

--
-- Name: content_versions; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.content_versions (
    content_key character varying(80) NOT NULL,
    version character varying(20) NOT NULL,
    body jsonb NOT NULL,
    effective_at timestamp with time zone NOT NULL,
    created_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.content_versions OWNER TO pli;

--
-- Name: daily_summaries; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.daily_summaries (
    pet_id uuid NOT NULL,
    summary_date date NOT NULL,
    summary text NOT NULL,
    fact_count integer NOT NULL,
    ai_inference_id uuid,
    provider character varying(40) NOT NULL,
    model character varying(80) NOT NULL,
    prompt_version character varying(20) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.daily_summaries OWNER TO pli;

--
-- Name: deletion_requests; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.deletion_requests (
    pet_id uuid NOT NULL,
    requested_by_user_id uuid NOT NULL,
    reason text NOT NULL,
    status character varying(20) NOT NULL,
    resolved_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.deletion_requests OWNER TO pli;

--
-- Name: device_events; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.device_events (
    pet_id uuid,
    device_id uuid,
    provider character varying(40) NOT NULL,
    provider_event_id character varying(120) NOT NULL,
    event_kind character varying(40) NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    payload jsonb NOT NULL,
    quality_status character varying(20) NOT NULL,
    quality_note character varying(200) NOT NULL,
    attribution character varying(20) NOT NULL,
    review_status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE public.device_events OWNER TO pli;

--
-- Name: diary_entries; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.diary_entries (
    pet_id uuid NOT NULL,
    entry_at timestamp with time zone NOT NULL,
    text text NOT NULL,
    audio_artifact_id uuid,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.diary_entries OWNER TO pli;

--
-- Name: diet_profiles; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.diet_profiles (
    pet_id uuid NOT NULL,
    current_food character varying(300) NOT NULL,
    allergies jsonb NOT NULL,
    feeding_rules text NOT NULL,
    vet_advised boolean NOT NULL,
    source_type character varying(40) NOT NULL,
    updated_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.diet_profiles OWNER TO pli;

--
-- Name: emergency_profiles; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.emergency_profiles (
    pet_id uuid NOT NULL,
    owner_contact character varying(200) NOT NULL,
    backup_contact character varying(200) NOT NULL,
    vet_clinic_name character varying(200) NOT NULL,
    vet_clinic_phone character varying(60) NOT NULL,
    vet_clinic_address_text text NOT NULL,
    critical_care_notes text NOT NULL,
    updated_by_user_id uuid,
    updated_at timestamp with time zone NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE public.emergency_profiles OWNER TO pli;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.expenses (
    pet_id uuid NOT NULL,
    household_id uuid NOT NULL,
    category character varying(30) NOT NULL,
    amount character varying(40) NOT NULL,
    currency character varying(8) NOT NULL,
    incurred_at timestamp with time zone NOT NULL,
    note character varying(300) NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.expenses OWNER TO pli;

--
-- Name: experiment_assignments; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.experiment_assignments (
    experiment_key character varying(80) NOT NULL,
    user_id uuid NOT NULL,
    bucket character varying(20) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.experiment_assignments OWNER TO pli;

--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.feature_flags (
    key character varying(80) NOT NULL,
    enabled boolean NOT NULL,
    note character varying(300) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.feature_flags OWNER TO pli;

--
-- Name: grants; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.grants (
    pet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    scopes jsonb NOT NULL,
    reason text NOT NULL,
    source character varying(20) NOT NULL,
    granted_by_user_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoked_by_user_id uuid,
    status character varying(20) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.grants OWNER TO pli;

--
-- Name: health_events; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.health_events (
    pet_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    chief_complaint text NOT NULL,
    onset_at timestamp with time zone,
    duration_text character varying(120) NOT NULL,
    eating character varying(20) NOT NULL,
    drinking character varying(20) NOT NULL,
    elimination character varying(20) NOT NULL,
    activity character varying(20) NOT NULL,
    current_meds_text text NOT NULL,
    relevant_history_text text NOT NULL,
    owner_notes text NOT NULL,
    opened_by_user_id uuid NOT NULL,
    closed_at timestamp with time zone,
    latest_triage_level character varying(20),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.health_events OWNER TO pli;

--
-- Name: health_records; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.health_records (
    pet_id uuid NOT NULL,
    kind character varying(30) NOT NULL,
    occurred_at timestamp with time zone,
    content jsonb NOT NULL,
    source_type character varying(40) NOT NULL,
    source_note character varying(300) NOT NULL,
    artifact_id uuid,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.health_records OWNER TO pli;

--
-- Name: household_expense_splits; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.household_expense_splits (
    expense_id uuid NOT NULL,
    user_id uuid NOT NULL,
    share character varying(40) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.household_expense_splits OWNER TO pli;

--
-- Name: household_members; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.household_members (
    household_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(40) NOT NULL,
    status character varying(20) NOT NULL,
    invited_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.household_members OWNER TO pli;

--
-- Name: households; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.households (
    name character varying(160) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.households OWNER TO pli;

--
-- Name: incidents; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.incidents (
    severity character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    detail text NOT NULL,
    status character varying(20) NOT NULL,
    resolved_at timestamp with time zone,
    created_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.incidents OWNER TO pli;

--
-- Name: insurance_policy_records; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.insurance_policy_records (
    pet_id uuid NOT NULL,
    policy_no character varying(80) NOT NULL,
    insurer_note character varying(200) NOT NULL,
    coverage_note character varying(300) NOT NULL,
    claims jsonb NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.insurance_policy_records OWNER TO pli;

--
-- Name: invitations; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.invitations (
    household_id uuid NOT NULL,
    email character varying(320) NOT NULL,
    role character varying(40) NOT NULL,
    token_hash character varying(128) NOT NULL,
    token_prefix character varying(16) NOT NULL,
    status character varying(20) NOT NULL,
    invited_by_user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.invitations OWNER TO pli;

--
-- Name: life_events; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.life_events (
    pet_id uuid NOT NULL,
    event_type character varying(60) NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    actor_id uuid NOT NULL,
    source_type character varying(40) NOT NULL,
    source_ref text,
    provenance_level character varying(40) NOT NULL,
    schema_version character varying(20) NOT NULL,
    payload jsonb NOT NULL,
    artifact_ids jsonb NOT NULL,
    supersedes_event_id uuid,
    retracted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    idempotency_key character varying(120),
    dedupe_key character varying(128),
    is_duplicate boolean NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE public.life_events OWNER TO pli;

--
-- Name: medication_doses; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.medication_doses (
    plan_id uuid NOT NULL,
    planned_at timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL,
    given_at timestamp with time zone,
    given_by_user_id uuid,
    note text NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.medication_doses OWNER TO pli;

--
-- Name: medication_plans; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.medication_plans (
    pet_id uuid NOT NULL,
    health_event_id uuid,
    medicine_name character varying(200) NOT NULL,
    dose_text character varying(200) NOT NULL,
    route character varying(60) NOT NULL,
    frequency_text character varying(120) NOT NULL,
    frequency_per_day integer NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    source_type character varying(40) NOT NULL,
    source_note character varying(300) NOT NULL,
    instructions text NOT NULL,
    status character varying(20) NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.medication_plans OWNER TO pli;

--
-- Name: merge_requests; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.merge_requests (
    pet_id_a uuid NOT NULL,
    pet_id_b uuid NOT NULL,
    evidence jsonb NOT NULL,
    status character varying(20) NOT NULL,
    requested_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.merge_requests OWNER TO pli;

--
-- Name: milestones; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.milestones (
    pet_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    kind character varying(40) NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    note text NOT NULL,
    artifact_ids jsonb NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.milestones OWNER TO pli;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.notifications (
    pet_id uuid,
    household_id uuid,
    recipient_user_id uuid,
    type character varying(60) NOT NULL,
    title character varying(200) NOT NULL,
    body text NOT NULL,
    data jsonb NOT NULL,
    read_at timestamp with time zone,
    dedupe_key character varying(160),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    target_role character varying(40)
);


ALTER TABLE public.notifications OWNER TO pli;

--
-- Name: observations; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.observations (
    health_event_id uuid NOT NULL,
    kind character varying(40) NOT NULL,
    text text NOT NULL,
    source_ref character varying(200) NOT NULL,
    artifact_ids jsonb NOT NULL,
    created_by_user_id uuid,
    ai_inference_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.observations OWNER TO pli;

--
-- Name: outcomes; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.outcomes (
    pet_id uuid NOT NULL,
    health_event_id uuid NOT NULL,
    outcome character varying(20) NOT NULL,
    notes text NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.outcomes OWNER TO pli;

--
-- Name: pet_devices; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.pet_devices (
    pet_id uuid NOT NULL,
    device_key character varying(120) NOT NULL,
    provider character varying(40) NOT NULL,
    display_name character varying(120) NOT NULL,
    status character varying(20) NOT NULL,
    linked_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.pet_devices OWNER TO pli;

--
-- Name: pet_friends; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.pet_friends (
    pet_id uuid NOT NULL,
    friend_pet_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    requested_by_user_id uuid NOT NULL,
    accepted_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.pet_friends OWNER TO pli;

--
-- Name: pet_identifiers; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.pet_identifiers (
    pet_id uuid NOT NULL,
    identifier_type character varying(30) NOT NULL,
    value character varying(120) NOT NULL,
    source_type character varying(40) NOT NULL,
    verified boolean NOT NULL,
    verified_at timestamp with time zone,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.pet_identifiers OWNER TO pli;

--
-- Name: pet_preferences; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.pet_preferences (
    pet_id uuid NOT NULL,
    kind character varying(30) NOT NULL,
    subject character varying(200) NOT NULL,
    note text NOT NULL,
    source_type character varying(40) NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.pet_preferences OWNER TO pli;

--
-- Name: pets; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.pets (
    household_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    species character varying(20) NOT NULL,
    breed character varying(160) NOT NULL,
    sex character varying(10) NOT NULL,
    birth_date date,
    neutered boolean,
    weight_note character varying(80) NOT NULL,
    timezone character varying(60) NOT NULL,
    avatar_artifact_id uuid,
    created_by_user_id uuid NOT NULL,
    archived_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    lifecycle_status character varying(20) NOT NULL
);


ALTER TABLE public.pets OWNER TO pli;

--
-- Name: professional_links; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.professional_links (
    pet_id uuid NOT NULL,
    user_id uuid,
    profession character varying(40) NOT NULL,
    display_name character varying(120) NOT NULL,
    credential_note character varying(300) NOT NULL,
    verified boolean NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.professional_links OWNER TO pli;

--
-- Name: recovery_plans; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.recovery_plans (
    health_event_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    items jsonb NOT NULL,
    created_by_user_id uuid NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.recovery_plans OWNER TO pli;

--
-- Name: relationships; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.relationships (
    pet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    created_by_user_id uuid NOT NULL,
    revoked_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.relationships OWNER TO pli;

--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.service_requests (
    pet_id uuid NOT NULL,
    service_kind character varying(40) NOT NULL,
    needs_profile jsonb NOT NULL,
    care_card_id uuid,
    provider_note character varying(300) NOT NULL,
    status character varying(20) NOT NULL,
    updates jsonb NOT NULL,
    summary jsonb,
    review jsonb,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.service_requests OWNER TO pli;

--
-- Name: share_tokens; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.share_tokens (
    pet_id uuid NOT NULL,
    resource_type character varying(30) NOT NULL,
    resource_id uuid NOT NULL,
    token_hash character varying(128) NOT NULL,
    token_prefix character varying(16) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    revoked_by_user_id uuid,
    created_by_user_id uuid NOT NULL,
    access_count integer NOT NULL,
    last_accessed_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.share_tokens OWNER TO pli;

--
-- Name: social_interactions; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.social_interactions (
    pet_id uuid NOT NULL,
    friend_pet_id uuid NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    quality character varying(40) NOT NULL,
    duration_minutes integer,
    notes text NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.social_interactions OWNER TO pli;

--
-- Name: social_profiles; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.social_profiles (
    pet_id uuid NOT NULL,
    good_with_dogs character varying(20) NOT NULL,
    good_with_cats character varying(20) NOT NULL,
    good_with_kids character varying(20) NOT NULL,
    good_with_strangers character varying(20) NOT NULL,
    notes text NOT NULL,
    updated_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.social_profiles OWNER TO pli;

--
-- Name: social_reports; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.social_reports (
    pet_id uuid NOT NULL,
    friend_pet_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    reason text NOT NULL,
    reported_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.social_reports OWNER TO pli;

--
-- Name: training_goals; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.training_goals (
    pet_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    target_behavior text NOT NULL,
    status character varying(20) NOT NULL,
    mastery_level integer NOT NULL,
    steps jsonb NOT NULL,
    target_date date,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.training_goals OWNER TO pli;

--
-- Name: training_sessions; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.training_sessions (
    pet_id uuid NOT NULL,
    goal_id uuid,
    session_at timestamp with time zone NOT NULL,
    duration_minutes integer NOT NULL,
    focus character varying(200) NOT NULL,
    notes text NOT NULL,
    pet_response character varying(40) NOT NULL,
    rewards_used jsonb NOT NULL,
    artifact_ids jsonb NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.training_sessions OWNER TO pli;

--
-- Name: transfer_requests; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.transfer_requests (
    pet_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_email character varying(320) NOT NULL,
    reason text NOT NULL,
    status character varying(20) NOT NULL,
    confirmed_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.transfer_requests OWNER TO pli;

--
-- Name: triage_assessments; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.triage_assessments (
    health_event_id uuid NOT NULL,
    level character varying(20) NOT NULL,
    engine character varying(30) NOT NULL,
    matched_rules jsonb NOT NULL,
    rule_engine_version character varying(20) NOT NULL,
    note text NOT NULL,
    created_by_user_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.triage_assessments OWNER TO pli;

--
-- Name: users; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.users (
    email character varying(320) NOT NULL,
    display_name character varying(120) NOT NULL,
    is_active boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.users OWNER TO pli;

--
-- Name: vet_briefs; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.vet_briefs (
    health_event_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    content jsonb NOT NULL,
    generated_by_user_id uuid NOT NULL,
    ai_inference_id uuid,
    engine_versions jsonb NOT NULL,
    retracted_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.vet_briefs OWNER TO pli;

--
-- Name: welfare_observations; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.welfare_observations (
    pet_id uuid NOT NULL,
    kind character varying(40) NOT NULL,
    observed_at timestamp with time zone NOT NULL,
    data jsonb NOT NULL,
    source_type character varying(40) NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.welfare_observations OWNER TO pli;

--
-- Name: welfare_profiles; Type: TABLE; Schema: public; Owner: pli
--

CREATE TABLE public.welfare_profiles (
    pet_id uuid NOT NULL,
    domains jsonb NOT NULL,
    updated_by_user_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.welfare_profiles OWNER TO pli;

--
-- Data for Name: agent_action_logs; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.agent_action_logs (pet_id, action_class, proposal, policy_result, executed, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: ai_inference_logs; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.ai_inference_logs (capability, provider, model, prompt_version, schema_version, trace_id, latency_ms, token_usage, safety_flags, fallback_used, input_summary, output_summary, pet_id, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.alembic_version (version_num) FROM stdin;
e8718b28c1eb
\.


--
-- Data for Name: analytics_counters; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.analytics_counters (metric, day, count, id, created_at) FROM stdin;
\.


--
-- Data for Name: artifacts; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.artifacts (pet_id, kind, content_type, size_bytes, sha256, storage_backend, storage_key, original_filename, sensitive, created_by_user_id, deleted_at, id, created_at) FROM stdin;
\.


--
-- Data for Name: audit_entries; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.audit_entries (occurred_at, actor_user_id, household_id, pet_id, action, resource_type, resource_id, detail, request_id, id) FROM stdin;
\.


--
-- Data for Name: automation_rules; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.automation_rules (pet_id, name, condition, action, requires_confirmation, enabled, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: baselines; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.baselines (pet_id, metric, value, unit, sample_count, window_days, algorithm, computed_at, id, created_at) FROM stdin;
\.


--
-- Data for Name: behavior_events; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.behavior_events (pet_id, occurred_at, antecedent, behavior, consequence, duration_seconds, intensity, intensity_source, people_involved, animals_involved, environment, owner_notes, artifact_ids, recorded_by_user_id, id, created_at) FROM stdin;
c8cec789-4cf9-4cc8-8402-127cbd1d1512	2026-09-13 03:00:00+00	快递员敲门	连续吠叫约1分钟，随后躲到沙发下	主人安抚后自行出来	60	MODERATE	OWNER_REPORTED	快递员		客厅	对敲门声敏感	[]	8a3aebde-8956-4a93-a01a-25bc5325f0bb	87e60be1-15d6-4779-95f1-3a25dce54da2	2026-09-12 19:09:11.976195+00
\.


--
-- Data for Name: behavior_intervention_plans; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.behavior_intervention_plans (pet_id, behavior_event_id, title, approach, steps, outcomes, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: care_cards; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.care_cards (pet_id, content, issued_by_user_id, expires_at, id, created_at) FROM stdin;
\.


--
-- Data for Name: care_handoffs; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.care_handoffs (pet_id, caregiver_user_id, owner_user_id, scope, start_at, end_at, status, grant_id, notes, ended_at, ended_by_user_id, id, created_at, checklist) FROM stdin;
\.


--
-- Data for Name: care_reminders; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.care_reminders (pet_id, kind, title, due_date, note, status, last_notified_at, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: care_tasks; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.care_tasks (pet_id, title, task_type, due_at, repeat_rule, assignee_user_id, status, completed_by_user_id, completed_at, completion_note, created_by_user_id, cancelled_at, conflict_count, id, created_at) FROM stdin;
c8cec789-4cf9-4cc8-8402-127cbd1d1512	Evening feeding	FEED	2026-09-13 11:00:00+00	DAILY	cd5ba12c-6734-4668-87ea-a4553518aec5	OPEN	\N	\N		8a3aebde-8956-4a93-a01a-25bc5325f0bb	\N	0	067b5a36-73cb-4ccf-8c7d-52a3feea6999	2026-09-12 19:09:11.97016+00
\.


--
-- Data for Name: clinical_intake_steps; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.clinical_intake_steps (health_event_id, question_id, question_text, answer_text, asked_by, ai_inference_id, answered_by_user_id, id, created_at) FROM stdin;
9f75c1ca-216c-43d1-b5ac-dd41eae6863a	onset_detail	最早什么时候发现？持续多久了？	三天前开始	RULE	\N	8a3aebde-8956-4a93-a01a-25bc5325f0bb	af698991-fdb7-4cbe-bab2-0611a65d6ba7	2026-09-12 19:09:12.001198+00
\.


--
-- Data for Name: consents; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.consents (pet_id, purpose, granted, updated_by_user_id, updated_at, id) FROM stdin;
\.


--
-- Data for Name: content_versions; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.content_versions (content_key, version, body, effective_at, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: daily_summaries; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.daily_summaries (pet_id, summary_date, summary, fact_count, ai_inference_id, provider, model, prompt_version, id, created_at) FROM stdin;
\.


--
-- Data for Name: deletion_requests; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.deletion_requests (pet_id, requested_by_user_id, reason, status, resolved_at, id, created_at) FROM stdin;
\.


--
-- Data for Name: device_events; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.device_events (pet_id, device_id, provider, provider_event_id, event_kind, occurred_at, payload, quality_status, quality_note, attribution, review_status, created_at, id) FROM stdin;
\.


--
-- Data for Name: diary_entries; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.diary_entries (pet_id, entry_at, text, audio_artifact_id, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: diet_profiles; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.diet_profiles (pet_id, current_food, allergies, feeding_rules, vet_advised, source_type, updated_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: emergency_profiles; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.emergency_profiles (pet_id, owner_contact, backup_contact, vet_clinic_name, vet_clinic_phone, vet_clinic_address_text, critical_care_notes, updated_by_user_id, updated_at, id) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.expenses (pet_id, household_id, category, amount, currency, incurred_at, note, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: experiment_assignments; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.experiment_assignments (experiment_key, user_id, bucket, id, created_at) FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.feature_flags (key, enabled, note, id, created_at) FROM stdin;
\.


--
-- Data for Name: grants; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.grants (pet_id, user_id, scopes, reason, source, granted_by_user_id, starts_at, expires_at, revoked_at, revoked_by_user_id, status, id, created_at) FROM stdin;
c8cec789-4cf9-4cc8-8402-127cbd1d1512	0355b3ee-592d-4798-afd6-9cdafad6dd54	["daily:read", "daily:write"]	历史照护交接（已到期示例）	DIRECT	8a3aebde-8956-4a93-a01a-25bc5325f0bb	2026-09-04 19:09:11.936285+00	2026-09-11 19:09:11.936285+00	\N	\N	EXPIRED	b124a8f4-c441-4c2a-952e-395cc8fa7d71	2026-09-12 19:09:12.046819+00
\.


--
-- Data for Name: health_events; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.health_events (pet_id, status, chief_complaint, onset_at, duration_text, eating, drinking, elimination, activity, current_meds_text, relevant_history_text, owner_notes, opened_by_user_id, closed_at, latest_triage_level, id, created_at) FROM stdin;
66e5c003-9269-4cab-b79c-8718f0701c1d	OPEN	左耳抓挠三天，有棕色分泌物，精神食欲正常	2026-09-09 19:09:11.936285+00	3天	NORMAL	NORMAL	NORMAL	NORMAL				8a3aebde-8956-4a93-a01a-25bc5325f0bb	\N	MONITOR	9f75c1ca-216c-43d1-b5ac-dd41eae6863a	2026-09-12 19:09:11.983663+00
66e5c003-9269-4cab-b79c-8718f0701c1d	OPEN	反复进猫砂盆但几乎尿不出来，频繁舔下体	2026-09-12 14:09:11.936285+00	5小时	REDUCED	NORMAL	ABNORMAL	LOW				8a3aebde-8956-4a93-a01a-25bc5325f0bb	\N	EMERGENCY	ec1e27a2-9102-40da-b855-cc8885906167	2026-09-12 19:09:12.040476+00
\.


--
-- Data for Name: health_records; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.health_records (pet_id, kind, occurred_at, content, source_type, source_note, artifact_id, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: household_expense_splits; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.household_expense_splits (expense_id, user_id, share, id, created_at) FROM stdin;
\.


--
-- Data for Name: household_members; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.household_members (household_id, user_id, role, status, invited_by_user_id, id, created_at) FROM stdin;
99e9fc3b-6e00-47f6-a1f0-2b2cbb207cec	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER	ACTIVE	\N	92c18152-5557-4002-b8d5-ca7ddaa984a4	2026-09-12 19:09:11.922141+00
99e9fc3b-6e00-47f6-a1f0-2b2cbb207cec	cd5ba12c-6734-4668-87ea-a4553518aec5	FAMILY	ACTIVE	\N	f9bbd49d-8992-422d-97f9-ae030dd20488	2026-09-12 19:09:11.922147+00
\.


--
-- Data for Name: households; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.households (name, id, created_at) FROM stdin;
Demo Family	99e9fc3b-6e00-47f6-a1f0-2b2cbb207cec	2026-09-12 19:09:11.919002+00
\.


--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.incidents (severity, title, detail, status, resolved_at, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: insurance_policy_records; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.insurance_policy_records (pet_id, policy_no, insurer_note, coverage_note, claims, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.invitations (household_id, email, role, token_hash, token_prefix, status, invited_by_user_id, expires_at, accepted_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: life_events; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.life_events (pet_id, event_type, occurred_at, recorded_at, actor_id, source_type, source_ref, provenance_level, schema_version, payload, artifact_ids, supersedes_event_id, retracted_at, created_at, idempotency_key, dedupe_key, is_duplicate, id) FROM stdin;
c8cec789-4cf9-4cc8-8402-127cbd1d1512	daily.meal	2026-09-13 00:00:00+00	2026-09-12 19:09:11.9455+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	\N	OWNER_REPORTED	1.0.0	{"unit": "g", "notes": "", "amount": "120", "food_type": "dog kibble"}	[]	\N	\N	2026-09-12 19:09:11.946289+00	\N	893f90907b840fe6f566880faadca7ff52f2f2b902229ec3793160b140d956d0	f	2cf9ae63-48d4-4493-9db9-42233f31f374
c8cec789-4cf9-4cc8-8402-127cbd1d1512	daily.walk	2026-09-13 02:00:00+00	2026-09-12 19:09:11.953435+00	cd5ba12c-6734-4668-87ea-a4553518aec5	CAREGIVER_REPORTED	\N	CAREGIVER_REPORTED	1.0.0	{"notes": "", "intensity": "normal", "distance_meters": "1500", "duration_minutes": 30}	[]	\N	\N	2026-09-12 19:09:11.95366+00	\N	7c722ed319873aad3ef5626d02cc206c9f0445d34d9f9bd4bc7f20c9d20efa8a	f	87de2303-4cfb-4b20-b83e-15d21457c459
c8cec789-4cf9-4cc8-8402-127cbd1d1512	daily.weight	2026-09-13 00:30:00+00	2026-09-12 19:09:11.965538+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	\N	OWNER_REPORTED	1.0.0	{"notes": "", "weight_kg": "12.2", "body_condition_score": 5}	[]	\N	\N	2026-09-12 19:09:11.96574+00	\N	6e90c5883f706b9e34719c4edf09368673b935ca814fd83313408154b64c57ef	f	c3f13e1e-bde9-4fa7-a661-c44617295e6a
66e5c003-9269-4cab-b79c-8718f0701c1d	daily.elimination	2026-09-13 00:45:00+00	2026-09-12 19:09:11.967758+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	\N	OWNER_REPORTED	1.0.0	{"kind": "urine", "notes": "", "quality": "normal"}	[]	\N	\N	2026-09-12 19:09:11.967938+00	\N	986fbd4e982ae44167a2d42429ee8768e668f60a85793bdab0b59aaf0beb07b5	f	5f5e4f26-3e9e-4f9f-828e-09ea004c9044
c8cec789-4cf9-4cc8-8402-127cbd1d1512	care.task_created	2026-09-12 19:09:11.972914+00	2026-09-12 19:09:11.974138+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	\N	OWNER_REPORTED	1.0.0	{"title": "Evening feeding", "due_at": "2026-09-13T19:00:00+08:00", "task_id": "067b5a36-73cb-4ccf-8c7d-52a3feea6999", "task_type": "FEED", "repeat_rule": "DAILY", "assignee_user_id": "cd5ba12c-6734-4668-87ea-a4553518aec5"}	[]	\N	\N	2026-09-12 19:09:11.974408+00	\N	6a8f99d41bb8fa23ece18ba89ef2e5d8732678b66972df648ac5c19d5c20121a	f	e8658687-4b5c-48f4-a911-f6f6f154806e
c8cec789-4cf9-4cc8-8402-127cbd1d1512	behavior.observed	2026-09-13 03:00:00+00	2026-09-12 19:09:11.980135+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	behavior_event:87e60be1-15d6-4779-95f1-3a25dce54da2	OWNER_REPORTED	1.0.0	{"behavior": "连续吠叫约1分钟，随后躲到沙发下", "intensity": "MODERATE", "intensity_source": "OWNER_REPORTED", "behavior_event_id": "87e60be1-15d6-4779-95f1-3a25dce54da2"}	[]	\N	\N	2026-09-12 19:09:11.98045+00	\N	bd933140e0f396ac8d96713f8d9d488e29140bc2cd8e383edd171f95d6f72d52	f	ff7b6e34-4079-4430-be99-11cc22a6bb80
66e5c003-9269-4cab-b79c-8718f0701c1d	health.event_opened	2026-09-12 19:09:11.986303+00	2026-09-12 19:09:11.987695+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	health_event:9f75c1ca-216c-43d1-b5ac-dd41eae6863a	OWNER_REPORTED	1.0.0	{"chief_complaint": "左耳抓挠三天，有棕色分泌物，精神食欲正常", "health_event_id": "9f75c1ca-216c-43d1-b5ac-dd41eae6863a"}	[]	\N	\N	2026-09-12 19:09:11.987914+00	\N	909eff6a48c6c2b93ff82fc4953e7d0cda530a197832df243198441515a49c0f	f	0b4a62a9-5fdc-4522-8c92-7a86bde1fede
c8cec789-4cf9-4cc8-8402-127cbd1d1512	medication.plan_created	2026-09-12 19:09:12.025186+00	2026-09-12 19:09:12.0303+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	PROFESSIONAL_CONFIRMED	\N	PROFESSIONAL_CONFIRMED	1.0.0	{"plan_id": "fa7359cb-d7ee-4294-812d-784d2371bbee", "dose_text": "50mg", "source_type": "PROFESSIONAL_CONFIRMED", "medicine_name": "Doxycycline"}	[]	\N	\N	2026-09-12 19:09:12.030573+00	\N	ec1aa7187c0eadb50923510627343f7031e481eba1c4d1c8d32ffcd80289adfa	f	fcd49462-c22e-450b-a143-ad8cfecf4588
c8cec789-4cf9-4cc8-8402-127cbd1d1512	medication.administered	2026-09-12 19:09:12.032326+00	2026-09-12 19:09:12.033595+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	\N	OWNER_REPORTED	1.0.0	{"status": "GIVEN", "dose_id": "0e471d8b-6ec8-4761-9d9a-6eebdedd2ea7", "plan_id": "fa7359cb-d7ee-4294-812d-784d2371bbee", "by_actor": "8a3aebde-8956-4a93-a01a-25bc5325f0bb", "administered_at": "2026-09-12T16:09:11.936285+08:00"}	[]	\N	\N	2026-09-12 19:09:12.033811+00	\N	849a4480e1319be91a8b7f4496ad0fc16c4ad86d0c3e6acb267e172f031e91c7	f	276c2482-00ce-4f6d-9f98-5a79a68ecd05
66e5c003-9269-4cab-b79c-8718f0701c1d	health.outcome_recorded	2026-09-12 19:09:12.037592+00	2026-09-12 19:09:12.038676+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	\N	OWNER_REPORTED	1.0.0	{"outcome": "IMPROVED", "outcome_id": "83bf700d-43d7-4dc7-9b65-2c74129638c4", "health_event_id": "9f75c1ca-216c-43d1-b5ac-dd41eae6863a"}	[]	\N	\N	2026-09-12 19:09:12.038896+00	\N	c324eccf618f6441ce4a46ab2ebaf703dd124a17acca2eb61d8e7a6863703108	f	69f39384-4cb5-48ee-b433-f5dc77ada42d
66e5c003-9269-4cab-b79c-8718f0701c1d	health.event_opened	2026-09-12 19:09:12.041683+00	2026-09-12 19:09:12.042808+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER_REPORTED	health_event:ec1e27a2-9102-40da-b855-cc8885906167	OWNER_REPORTED	1.0.0	{"chief_complaint": "反复进猫砂盆但几乎尿不出来，频繁舔下体", "health_event_id": "ec1e27a2-9102-40da-b855-cc8885906167"}	[]	\N	\N	2026-09-12 19:09:12.043016+00	\N	81961ed3d70e7a671815e45007270c208c3b0ce2255bafdd39bfa2f01a9cefc3	f	956e3804-4ea5-4cba-8c1c-741d132f30eb
c8cec789-4cf9-4cc8-8402-127cbd1d1512	today.viewed	2026-09-12 19:10:52.667226+00	2026-09-12 19:10:52.667291+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb	SYSTEM_CALCULATED	\N	SYSTEM_CALCULATED	1.0.0	{"date": "2026-09-13"}	[]	\N	\N	2026-09-12 19:10:52.668842+00	\N	f0ebf9fd94d30b2de4d3736c18be81a30ca606bdeb4155eccea536899d2675cd	f	a4c3e253-8e31-49d9-93d0-ed6a86420e07
\.


--
-- Data for Name: medication_doses; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.medication_doses (plan_id, planned_at, status, given_at, given_by_user_id, note, id, created_at) FROM stdin;
fa7359cb-d7ee-4294-812d-784d2371bbee	2026-09-12 07:09:11.936285+00	GIVEN	2026-09-12 08:09:11.936285+00	8a3aebde-8956-4a93-a01a-25bc5325f0bb		0e471d8b-6ec8-4761-9d9a-6eebdedd2ea7	2026-09-12 19:09:12.020311+00
fa7359cb-d7ee-4294-812d-784d2371bbee	2026-09-12 19:09:11.936285+00	PENDING	\N	\N		a08b91a2-96e0-4ca1-888a-dd192907f5e3	2026-09-12 19:09:12.023749+00
\.


--
-- Data for Name: medication_plans; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.medication_plans (pet_id, health_event_id, medicine_name, dose_text, route, frequency_text, frequency_per_day, start_date, end_date, source_type, source_note, instructions, status, created_by_user_id, id, created_at) FROM stdin;
c8cec789-4cf9-4cc8-8402-127cbd1d1512	\N	Doxycycline	50mg	oral	每天2次，连用7天	2	2026-09-12 07:09:11.936285+00	2026-09-18 19:09:11.936285+00	PROFESSIONAL_CONFIRMED	Dr. Wang @ Sunshine Vet Clinic	饭后服用	ACTIVE	8a3aebde-8956-4a93-a01a-25bc5325f0bb	fa7359cb-d7ee-4294-812d-784d2371bbee	2026-09-12 19:09:12.016027+00
\.


--
-- Data for Name: merge_requests; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.merge_requests (pet_id_a, pet_id_b, evidence, status, requested_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.milestones (pet_id, title, kind, occurred_at, note, artifact_ids, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.notifications (pet_id, household_id, recipient_user_id, type, title, body, data, read_at, dedupe_key, id, created_at, target_role) FROM stdin;
\.


--
-- Data for Name: observations; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.observations (health_event_id, kind, text, source_ref, artifact_ids, created_by_user_id, ai_inference_id, id, created_at) FROM stdin;
9f75c1ca-216c-43d1-b5ac-dd41eae6863a	OWNER_STATEMENT	左耳有棕色分泌物，频繁抓挠		[]	8a3aebde-8956-4a93-a01a-25bc5325f0bb	\N	828631bf-4123-410c-9f84-8ea5c5fa89ff	2026-09-12 19:09:12.007803+00
\.


--
-- Data for Name: outcomes; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.outcomes (pet_id, health_event_id, outcome, notes, recorded_by_user_id, id, created_at) FROM stdin;
66e5c003-9269-4cab-b79c-8718f0701c1d	9f75c1ca-216c-43d1-b5ac-dd41eae6863a	IMPROVED	清耳后分泌物减少	8a3aebde-8956-4a93-a01a-25bc5325f0bb	83bf700d-43d7-4dc7-9b65-2c74129638c4	2026-09-12 19:09:12.035464+00
\.


--
-- Data for Name: pet_devices; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.pet_devices (pet_id, device_key, provider, display_name, status, linked_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: pet_friends; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.pet_friends (pet_id, friend_pet_id, status, requested_by_user_id, accepted_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: pet_identifiers; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.pet_identifiers (pet_id, identifier_type, value, source_type, verified, verified_at, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: pet_preferences; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.pet_preferences (pet_id, kind, subject, note, source_type, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: pets; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.pets (household_id, name, species, breed, sex, birth_date, neutered, weight_note, timezone, avatar_artifact_id, created_by_user_id, archived_at, id, created_at, lifecycle_status) FROM stdin;
99e9fc3b-6e00-47f6-a1f0-2b2cbb207cec	Coco	dog	Corgi	FEMALE	2022-05-01	t	12kg	Asia/Shanghai	\N	8a3aebde-8956-4a93-a01a-25bc5325f0bb	\N	c8cec789-4cf9-4cc8-8402-127cbd1d1512	2026-09-12 19:09:11.92829+00	ACTIVE
99e9fc3b-6e00-47f6-a1f0-2b2cbb207cec	Mimi	cat	DLH	MALE	2021-11-20	t	4.5kg	Asia/Shanghai	\N	8a3aebde-8956-4a93-a01a-25bc5325f0bb	\N	66e5c003-9269-4cab-b79c-8718f0701c1d	2026-09-12 19:09:11.928295+00	ACTIVE
\.


--
-- Data for Name: professional_links; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.professional_links (pet_id, user_id, profession, display_name, credential_note, verified, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: recovery_plans; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.recovery_plans (health_event_id, pet_id, items, created_by_user_id, updated_at, id, created_at) FROM stdin;
\.


--
-- Data for Name: relationships; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.relationships (pet_id, user_id, role, created_by_user_id, revoked_at, id, created_at) FROM stdin;
c8cec789-4cf9-4cc8-8402-127cbd1d1512	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER	8a3aebde-8956-4a93-a01a-25bc5325f0bb	\N	97162f2d-1b63-430f-ba0e-57c84f3fc75b	2026-09-12 19:09:11.933807+00
66e5c003-9269-4cab-b79c-8718f0701c1d	8a3aebde-8956-4a93-a01a-25bc5325f0bb	OWNER	8a3aebde-8956-4a93-a01a-25bc5325f0bb	\N	6626a74c-775f-49eb-b041-0019a46412d1	2026-09-12 19:09:11.933812+00
\.


--
-- Data for Name: service_requests; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.service_requests (pet_id, service_kind, needs_profile, care_card_id, provider_note, status, updates, summary, review, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: share_tokens; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.share_tokens (pet_id, resource_type, resource_id, token_hash, token_prefix, expires_at, revoked_at, revoked_by_user_id, created_by_user_id, access_count, last_accessed_at, id, created_at) FROM stdin;
\.


--
-- Data for Name: social_interactions; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.social_interactions (pet_id, friend_pet_id, occurred_at, quality, duration_minutes, notes, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: social_profiles; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.social_profiles (pet_id, good_with_dogs, good_with_cats, good_with_kids, good_with_strangers, notes, updated_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: social_reports; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.social_reports (pet_id, friend_pet_id, action, reason, reported_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: training_goals; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.training_goals (pet_id, title, target_behavior, status, mastery_level, steps, target_date, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: training_sessions; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.training_sessions (pet_id, goal_id, session_at, duration_minutes, focus, notes, pet_response, rewards_used, artifact_ids, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: transfer_requests; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.transfer_requests (pet_id, from_user_id, to_user_email, reason, status, confirmed_at, id, created_at) FROM stdin;
\.


--
-- Data for Name: triage_assessments; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.triage_assessments (health_event_id, level, engine, matched_rules, rule_engine_version, note, created_by_user_id, id, created_at) FROM stdin;
9f75c1ca-216c-43d1-b5ac-dd41eae6863a	MONITOR	RULE_ENGINE	[]	1.0.0		8a3aebde-8956-4a93-a01a-25bc5325f0bb	6ac4e36c-ca4e-498a-a23f-cee72cafd57e	2026-09-12 19:09:12.011246+00
ec1e27a2-9102-40da-b855-cc8885906167	EMERGENCY	RULE_ENGINE	[{"triage": "EMERGENCY", "rule_id": "RF-UOBSTRUCTION", "rule_version": "1.0.0", "matched_keywords": ["反复进猫砂盆", "尿不出来"]}]	1.0.0		8a3aebde-8956-4a93-a01a-25bc5325f0bb	897015d4-99b5-452e-b845-011188922c73	2026-09-12 19:09:12.045053+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.users (email, display_name, is_active, id, created_at) FROM stdin;
owner@pli.demo	Demo Owner	t	8a3aebde-8956-4a93-a01a-25bc5325f0bb	2026-09-12 19:09:11.914655+00
family@pli.demo	Demo Family Member	t	cd5ba12c-6734-4668-87ea-a4553518aec5	2026-09-12 19:09:11.914662+00
sitter@pli.demo	Demo Sitter	t	0355b3ee-592d-4798-afd6-9cdafad6dd54	2026-09-12 19:09:11.914666+00
\.


--
-- Data for Name: vet_briefs; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.vet_briefs (health_event_id, pet_id, content, generated_by_user_id, ai_inference_id, engine_versions, retracted_at, id, created_at) FROM stdin;
\.


--
-- Data for Name: welfare_observations; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.welfare_observations (pet_id, kind, observed_at, data, source_type, created_by_user_id, id, created_at) FROM stdin;
\.


--
-- Data for Name: welfare_profiles; Type: TABLE DATA; Schema: public; Owner: pli
--

COPY public.welfare_profiles (pet_id, domains, updated_by_user_id, id, created_at) FROM stdin;
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: agent_action_logs pk_agent_action_logs; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.agent_action_logs
    ADD CONSTRAINT pk_agent_action_logs PRIMARY KEY (id);


--
-- Name: ai_inference_logs pk_ai_inference_logs; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.ai_inference_logs
    ADD CONSTRAINT pk_ai_inference_logs PRIMARY KEY (id);


--
-- Name: analytics_counters pk_analytics_counters; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.analytics_counters
    ADD CONSTRAINT pk_analytics_counters PRIMARY KEY (id);


--
-- Name: artifacts pk_artifacts; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT pk_artifacts PRIMARY KEY (id);


--
-- Name: audit_entries pk_audit_entries; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.audit_entries
    ADD CONSTRAINT pk_audit_entries PRIMARY KEY (id);


--
-- Name: automation_rules pk_automation_rules; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT pk_automation_rules PRIMARY KEY (id);


--
-- Name: baselines pk_baselines; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.baselines
    ADD CONSTRAINT pk_baselines PRIMARY KEY (id);


--
-- Name: behavior_events pk_behavior_events; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.behavior_events
    ADD CONSTRAINT pk_behavior_events PRIMARY KEY (id);


--
-- Name: behavior_intervention_plans pk_behavior_intervention_plans; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.behavior_intervention_plans
    ADD CONSTRAINT pk_behavior_intervention_plans PRIMARY KEY (id);


--
-- Name: care_cards pk_care_cards; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_cards
    ADD CONSTRAINT pk_care_cards PRIMARY KEY (id);


--
-- Name: care_handoffs pk_care_handoffs; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_handoffs
    ADD CONSTRAINT pk_care_handoffs PRIMARY KEY (id);


--
-- Name: care_reminders pk_care_reminders; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_reminders
    ADD CONSTRAINT pk_care_reminders PRIMARY KEY (id);


--
-- Name: care_tasks pk_care_tasks; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_tasks
    ADD CONSTRAINT pk_care_tasks PRIMARY KEY (id);


--
-- Name: clinical_intake_steps pk_clinical_intake_steps; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.clinical_intake_steps
    ADD CONSTRAINT pk_clinical_intake_steps PRIMARY KEY (id);


--
-- Name: consents pk_consents; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT pk_consents PRIMARY KEY (id);


--
-- Name: content_versions pk_content_versions; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT pk_content_versions PRIMARY KEY (id);


--
-- Name: daily_summaries pk_daily_summaries; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.daily_summaries
    ADD CONSTRAINT pk_daily_summaries PRIMARY KEY (id);


--
-- Name: deletion_requests pk_deletion_requests; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.deletion_requests
    ADD CONSTRAINT pk_deletion_requests PRIMARY KEY (id);


--
-- Name: device_events pk_device_events; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.device_events
    ADD CONSTRAINT pk_device_events PRIMARY KEY (id);


--
-- Name: diary_entries pk_diary_entries; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.diary_entries
    ADD CONSTRAINT pk_diary_entries PRIMARY KEY (id);


--
-- Name: diet_profiles pk_diet_profiles; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.diet_profiles
    ADD CONSTRAINT pk_diet_profiles PRIMARY KEY (id);


--
-- Name: emergency_profiles pk_emergency_profiles; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.emergency_profiles
    ADD CONSTRAINT pk_emergency_profiles PRIMARY KEY (id);


--
-- Name: expenses pk_expenses; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT pk_expenses PRIMARY KEY (id);


--
-- Name: experiment_assignments pk_experiment_assignments; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.experiment_assignments
    ADD CONSTRAINT pk_experiment_assignments PRIMARY KEY (id);


--
-- Name: feature_flags pk_feature_flags; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT pk_feature_flags PRIMARY KEY (id);


--
-- Name: grants pk_grants; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.grants
    ADD CONSTRAINT pk_grants PRIMARY KEY (id);


--
-- Name: health_events pk_health_events; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.health_events
    ADD CONSTRAINT pk_health_events PRIMARY KEY (id);


--
-- Name: health_records pk_health_records; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT pk_health_records PRIMARY KEY (id);


--
-- Name: household_expense_splits pk_household_expense_splits; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_expense_splits
    ADD CONSTRAINT pk_household_expense_splits PRIMARY KEY (id);


--
-- Name: household_members pk_household_members; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT pk_household_members PRIMARY KEY (id);


--
-- Name: households pk_households; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT pk_households PRIMARY KEY (id);


--
-- Name: incidents pk_incidents; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT pk_incidents PRIMARY KEY (id);


--
-- Name: insurance_policy_records pk_insurance_policy_records; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.insurance_policy_records
    ADD CONSTRAINT pk_insurance_policy_records PRIMARY KEY (id);


--
-- Name: invitations pk_invitations; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT pk_invitations PRIMARY KEY (id);


--
-- Name: life_events pk_life_events; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.life_events
    ADD CONSTRAINT pk_life_events PRIMARY KEY (id);


--
-- Name: medication_doses pk_medication_doses; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.medication_doses
    ADD CONSTRAINT pk_medication_doses PRIMARY KEY (id);


--
-- Name: medication_plans pk_medication_plans; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.medication_plans
    ADD CONSTRAINT pk_medication_plans PRIMARY KEY (id);


--
-- Name: merge_requests pk_merge_requests; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.merge_requests
    ADD CONSTRAINT pk_merge_requests PRIMARY KEY (id);


--
-- Name: milestones pk_milestones; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT pk_milestones PRIMARY KEY (id);


--
-- Name: notifications pk_notifications; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT pk_notifications PRIMARY KEY (id);


--
-- Name: observations pk_observations; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT pk_observations PRIMARY KEY (id);


--
-- Name: outcomes pk_outcomes; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT pk_outcomes PRIMARY KEY (id);


--
-- Name: pet_devices pk_pet_devices; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_devices
    ADD CONSTRAINT pk_pet_devices PRIMARY KEY (id);


--
-- Name: pet_friends pk_pet_friends; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_friends
    ADD CONSTRAINT pk_pet_friends PRIMARY KEY (id);


--
-- Name: pet_identifiers pk_pet_identifiers; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_identifiers
    ADD CONSTRAINT pk_pet_identifiers PRIMARY KEY (id);


--
-- Name: pet_preferences pk_pet_preferences; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_preferences
    ADD CONSTRAINT pk_pet_preferences PRIMARY KEY (id);


--
-- Name: pets pk_pets; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pk_pets PRIMARY KEY (id);


--
-- Name: professional_links pk_professional_links; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.professional_links
    ADD CONSTRAINT pk_professional_links PRIMARY KEY (id);


--
-- Name: recovery_plans pk_recovery_plans; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.recovery_plans
    ADD CONSTRAINT pk_recovery_plans PRIMARY KEY (id);


--
-- Name: relationships pk_relationships; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT pk_relationships PRIMARY KEY (id);


--
-- Name: service_requests pk_service_requests; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT pk_service_requests PRIMARY KEY (id);


--
-- Name: share_tokens pk_share_tokens; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT pk_share_tokens PRIMARY KEY (id);


--
-- Name: social_interactions pk_social_interactions; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_interactions
    ADD CONSTRAINT pk_social_interactions PRIMARY KEY (id);


--
-- Name: social_profiles pk_social_profiles; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT pk_social_profiles PRIMARY KEY (id);


--
-- Name: social_reports pk_social_reports; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_reports
    ADD CONSTRAINT pk_social_reports PRIMARY KEY (id);


--
-- Name: training_goals pk_training_goals; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.training_goals
    ADD CONSTRAINT pk_training_goals PRIMARY KEY (id);


--
-- Name: training_sessions pk_training_sessions; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT pk_training_sessions PRIMARY KEY (id);


--
-- Name: transfer_requests pk_transfer_requests; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT pk_transfer_requests PRIMARY KEY (id);


--
-- Name: triage_assessments pk_triage_assessments; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.triage_assessments
    ADD CONSTRAINT pk_triage_assessments PRIMARY KEY (id);


--
-- Name: users pk_users; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: vet_briefs pk_vet_briefs; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.vet_briefs
    ADD CONSTRAINT pk_vet_briefs PRIMARY KEY (id);


--
-- Name: welfare_observations pk_welfare_observations; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.welfare_observations
    ADD CONSTRAINT pk_welfare_observations PRIMARY KEY (id);


--
-- Name: welfare_profiles pk_welfare_profiles; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.welfare_profiles
    ADD CONSTRAINT pk_welfare_profiles PRIMARY KEY (id);


--
-- Name: analytics_counters uq_analytics_counters_metric; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.analytics_counters
    ADD CONSTRAINT uq_analytics_counters_metric UNIQUE (metric, day);


--
-- Name: baselines uq_baselines_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.baselines
    ADD CONSTRAINT uq_baselines_pet_id UNIQUE (pet_id, metric);


--
-- Name: consents uq_consents_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT uq_consents_pet_id UNIQUE (pet_id, purpose);


--
-- Name: content_versions uq_content_versions_content_key; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT uq_content_versions_content_key UNIQUE (content_key, version);


--
-- Name: daily_summaries uq_daily_summaries_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.daily_summaries
    ADD CONSTRAINT uq_daily_summaries_pet_id UNIQUE (pet_id, summary_date);


--
-- Name: device_events uq_device_events_provider; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.device_events
    ADD CONSTRAINT uq_device_events_provider UNIQUE (provider, provider_event_id);


--
-- Name: diet_profiles uq_diet_profiles_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.diet_profiles
    ADD CONSTRAINT uq_diet_profiles_pet_id UNIQUE (pet_id);


--
-- Name: emergency_profiles uq_emergency_profiles_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.emergency_profiles
    ADD CONSTRAINT uq_emergency_profiles_pet_id UNIQUE (pet_id);


--
-- Name: experiment_assignments uq_experiment_assignments_experiment_key; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.experiment_assignments
    ADD CONSTRAINT uq_experiment_assignments_experiment_key UNIQUE (experiment_key, user_id);


--
-- Name: feature_flags uq_feature_flags_key; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT uq_feature_flags_key UNIQUE (key);


--
-- Name: household_expense_splits uq_household_expense_splits_expense_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_expense_splits
    ADD CONSTRAINT uq_household_expense_splits_expense_id UNIQUE (expense_id, user_id);


--
-- Name: household_members uq_household_members_household_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT uq_household_members_household_id UNIQUE (household_id, user_id);


--
-- Name: life_events uq_lifeevent_idem; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.life_events
    ADD CONSTRAINT uq_lifeevent_idem UNIQUE (pet_id, idempotency_key);


--
-- Name: medication_doses uq_medication_doses_plan_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.medication_doses
    ADD CONSTRAINT uq_medication_doses_plan_id UNIQUE (plan_id, planned_at);


--
-- Name: notifications uq_notifications_dedupe_key; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT uq_notifications_dedupe_key UNIQUE (dedupe_key);


--
-- Name: pet_devices uq_pet_devices_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_devices
    ADD CONSTRAINT uq_pet_devices_pet_id UNIQUE (pet_id, device_key);


--
-- Name: pet_friends uq_pet_friends_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_friends
    ADD CONSTRAINT uq_pet_friends_pet_id UNIQUE (pet_id, friend_pet_id);


--
-- Name: pet_identifiers uq_pet_identifiers_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_identifiers
    ADD CONSTRAINT uq_pet_identifiers_pet_id UNIQUE (pet_id, identifier_type, value);


--
-- Name: pet_preferences uq_pet_preferences_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_preferences
    ADD CONSTRAINT uq_pet_preferences_pet_id UNIQUE (pet_id, kind, subject);


--
-- Name: relationships uq_relationships_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT uq_relationships_pet_id UNIQUE (pet_id, user_id);


--
-- Name: share_tokens uq_share_tokens_token_hash; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT uq_share_tokens_token_hash UNIQUE (token_hash);


--
-- Name: social_profiles uq_social_profiles_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT uq_social_profiles_pet_id UNIQUE (pet_id);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: welfare_profiles uq_welfare_profiles_pet_id; Type: CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.welfare_profiles
    ADD CONSTRAINT uq_welfare_profiles_pet_id UNIQUE (pet_id);


--
-- Name: ix_audit_household_time; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_audit_household_time ON public.audit_entries USING btree (household_id, occurred_at);


--
-- Name: ix_audit_pet_time; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_audit_pet_time ON public.audit_entries USING btree (pet_id, occurred_at);


--
-- Name: ix_behavior_pet; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_behavior_pet ON public.behavior_events USING btree (pet_id);


--
-- Name: ix_care_reminders_due; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_care_reminders_due ON public.care_reminders USING btree (pet_id, due_date);


--
-- Name: ix_care_tasks_pet_due; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_care_tasks_pet_due ON public.care_tasks USING btree (pet_id, due_at);


--
-- Name: ix_device_events_pet_time; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_device_events_pet_time ON public.device_events USING btree (pet_id, occurred_at);


--
-- Name: ix_diary_pet_time; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_diary_pet_time ON public.diary_entries USING btree (pet_id, entry_at);


--
-- Name: ix_expenses_pet_time; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_expenses_pet_time ON public.expenses USING btree (pet_id, incurred_at);


--
-- Name: ix_grants_user_pet; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_grants_user_pet ON public.grants USING btree (user_id, pet_id);


--
-- Name: ix_health_events_pet; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_health_events_pet ON public.health_events USING btree (pet_id);


--
-- Name: ix_health_records_pet; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_health_records_pet ON public.health_records USING btree (pet_id);


--
-- Name: ix_intake_steps_event; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_intake_steps_event ON public.clinical_intake_steps USING btree (health_event_id);


--
-- Name: ix_life_events_pet_time; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_life_events_pet_time ON public.life_events USING btree (pet_id, occurred_at);


--
-- Name: ix_life_events_pet_type; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_life_events_pet_type ON public.life_events USING btree (pet_id, event_type);


--
-- Name: ix_med_doses_due; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_med_doses_due ON public.medication_doses USING btree (planned_at, status);


--
-- Name: ix_med_doses_plan; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_med_doses_plan ON public.medication_doses USING btree (plan_id);


--
-- Name: ix_med_plans_pet; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_med_plans_pet ON public.medication_plans USING btree (pet_id);


--
-- Name: ix_notifications_household; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_notifications_household ON public.notifications USING btree (household_id, created_at);


--
-- Name: ix_observations_event; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_observations_event ON public.observations USING btree (health_event_id);


--
-- Name: ix_outcomes_event; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_outcomes_event ON public.outcomes USING btree (health_event_id);


--
-- Name: ix_share_tokens_resource; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_share_tokens_resource ON public.share_tokens USING btree (resource_type, resource_id);


--
-- Name: ix_social_interactions_pet; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_social_interactions_pet ON public.social_interactions USING btree (pet_id);


--
-- Name: ix_training_sessions_pet; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_training_sessions_pet ON public.training_sessions USING btree (pet_id);


--
-- Name: ix_triage_event; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_triage_event ON public.triage_assessments USING btree (health_event_id);


--
-- Name: ix_welfare_obs_pet; Type: INDEX; Schema: public; Owner: pli
--

CREATE INDEX ix_welfare_obs_pet ON public.welfare_observations USING btree (pet_id);


--
-- Name: artifacts fk_artifacts_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT fk_artifacts_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: artifacts fk_artifacts_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT fk_artifacts_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: automation_rules fk_automation_rules_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT fk_automation_rules_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: automation_rules fk_automation_rules_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT fk_automation_rules_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: baselines fk_baselines_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.baselines
    ADD CONSTRAINT fk_baselines_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: behavior_events fk_behavior_events_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.behavior_events
    ADD CONSTRAINT fk_behavior_events_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: behavior_events fk_behavior_events_recorded_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.behavior_events
    ADD CONSTRAINT fk_behavior_events_recorded_by_user_id_users FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(id);


--
-- Name: behavior_intervention_plans fk_behavior_intervention_plans_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.behavior_intervention_plans
    ADD CONSTRAINT fk_behavior_intervention_plans_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: behavior_intervention_plans fk_behavior_intervention_plans_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.behavior_intervention_plans
    ADD CONSTRAINT fk_behavior_intervention_plans_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: care_cards fk_care_cards_issued_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_cards
    ADD CONSTRAINT fk_care_cards_issued_by_user_id_users FOREIGN KEY (issued_by_user_id) REFERENCES public.users(id);


--
-- Name: care_cards fk_care_cards_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_cards
    ADD CONSTRAINT fk_care_cards_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: care_handoffs fk_care_handoffs_caregiver_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_handoffs
    ADD CONSTRAINT fk_care_handoffs_caregiver_user_id_users FOREIGN KEY (caregiver_user_id) REFERENCES public.users(id);


--
-- Name: care_handoffs fk_care_handoffs_grant_id_grants; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_handoffs
    ADD CONSTRAINT fk_care_handoffs_grant_id_grants FOREIGN KEY (grant_id) REFERENCES public.grants(id);


--
-- Name: care_handoffs fk_care_handoffs_owner_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_handoffs
    ADD CONSTRAINT fk_care_handoffs_owner_user_id_users FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- Name: care_handoffs fk_care_handoffs_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_handoffs
    ADD CONSTRAINT fk_care_handoffs_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: care_reminders fk_care_reminders_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_reminders
    ADD CONSTRAINT fk_care_reminders_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: care_reminders fk_care_reminders_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_reminders
    ADD CONSTRAINT fk_care_reminders_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: care_tasks fk_care_tasks_assignee_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_tasks
    ADD CONSTRAINT fk_care_tasks_assignee_user_id_users FOREIGN KEY (assignee_user_id) REFERENCES public.users(id);


--
-- Name: care_tasks fk_care_tasks_completed_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_tasks
    ADD CONSTRAINT fk_care_tasks_completed_by_user_id_users FOREIGN KEY (completed_by_user_id) REFERENCES public.users(id);


--
-- Name: care_tasks fk_care_tasks_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_tasks
    ADD CONSTRAINT fk_care_tasks_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: care_tasks fk_care_tasks_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.care_tasks
    ADD CONSTRAINT fk_care_tasks_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: clinical_intake_steps fk_clinical_intake_steps_answered_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.clinical_intake_steps
    ADD CONSTRAINT fk_clinical_intake_steps_answered_by_user_id_users FOREIGN KEY (answered_by_user_id) REFERENCES public.users(id);


--
-- Name: clinical_intake_steps fk_clinical_intake_steps_health_event_id_health_events; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.clinical_intake_steps
    ADD CONSTRAINT fk_clinical_intake_steps_health_event_id_health_events FOREIGN KEY (health_event_id) REFERENCES public.health_events(id);


--
-- Name: consents fk_consents_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT fk_consents_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: consents fk_consents_updated_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT fk_consents_updated_by_user_id_users FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: daily_summaries fk_daily_summaries_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.daily_summaries
    ADD CONSTRAINT fk_daily_summaries_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: deletion_requests fk_deletion_requests_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.deletion_requests
    ADD CONSTRAINT fk_deletion_requests_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: deletion_requests fk_deletion_requests_requested_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.deletion_requests
    ADD CONSTRAINT fk_deletion_requests_requested_by_user_id_users FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id);


--
-- Name: device_events fk_device_events_device_id_pet_devices; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.device_events
    ADD CONSTRAINT fk_device_events_device_id_pet_devices FOREIGN KEY (device_id) REFERENCES public.pet_devices(id);


--
-- Name: diary_entries fk_diary_entries_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.diary_entries
    ADD CONSTRAINT fk_diary_entries_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: diary_entries fk_diary_entries_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.diary_entries
    ADD CONSTRAINT fk_diary_entries_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: diet_profiles fk_diet_profiles_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.diet_profiles
    ADD CONSTRAINT fk_diet_profiles_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: diet_profiles fk_diet_profiles_updated_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.diet_profiles
    ADD CONSTRAINT fk_diet_profiles_updated_by_user_id_users FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: emergency_profiles fk_emergency_profiles_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.emergency_profiles
    ADD CONSTRAINT fk_emergency_profiles_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: emergency_profiles fk_emergency_profiles_updated_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.emergency_profiles
    ADD CONSTRAINT fk_emergency_profiles_updated_by_user_id_users FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: expenses fk_expenses_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: expenses fk_expenses_household_id_households; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_household_id_households FOREIGN KEY (household_id) REFERENCES public.households(id);


--
-- Name: expenses fk_expenses_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: experiment_assignments fk_experiment_assignments_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.experiment_assignments
    ADD CONSTRAINT fk_experiment_assignments_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: grants fk_grants_granted_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.grants
    ADD CONSTRAINT fk_grants_granted_by_user_id_users FOREIGN KEY (granted_by_user_id) REFERENCES public.users(id);


--
-- Name: grants fk_grants_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.grants
    ADD CONSTRAINT fk_grants_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: grants fk_grants_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.grants
    ADD CONSTRAINT fk_grants_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: health_events fk_health_events_opened_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.health_events
    ADD CONSTRAINT fk_health_events_opened_by_user_id_users FOREIGN KEY (opened_by_user_id) REFERENCES public.users(id);


--
-- Name: health_events fk_health_events_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.health_events
    ADD CONSTRAINT fk_health_events_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: health_records fk_health_records_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT fk_health_records_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: health_records fk_health_records_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT fk_health_records_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: household_expense_splits fk_household_expense_splits_expense_id_expenses; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_expense_splits
    ADD CONSTRAINT fk_household_expense_splits_expense_id_expenses FOREIGN KEY (expense_id) REFERENCES public.expenses(id);


--
-- Name: household_expense_splits fk_household_expense_splits_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_expense_splits
    ADD CONSTRAINT fk_household_expense_splits_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: household_members fk_household_members_household_id_households; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT fk_household_members_household_id_households FOREIGN KEY (household_id) REFERENCES public.households(id);


--
-- Name: household_members fk_household_members_invited_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT fk_household_members_invited_by_user_id_users FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id);


--
-- Name: household_members fk_household_members_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT fk_household_members_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: insurance_policy_records fk_insurance_policy_records_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.insurance_policy_records
    ADD CONSTRAINT fk_insurance_policy_records_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: insurance_policy_records fk_insurance_policy_records_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.insurance_policy_records
    ADD CONSTRAINT fk_insurance_policy_records_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: invitations fk_invitations_accepted_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT fk_invitations_accepted_by_user_id_users FOREIGN KEY (accepted_by_user_id) REFERENCES public.users(id);


--
-- Name: invitations fk_invitations_household_id_households; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT fk_invitations_household_id_households FOREIGN KEY (household_id) REFERENCES public.households(id);


--
-- Name: invitations fk_invitations_invited_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT fk_invitations_invited_by_user_id_users FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id);


--
-- Name: life_events fk_life_events_actor_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.life_events
    ADD CONSTRAINT fk_life_events_actor_id_users FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: life_events fk_life_events_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.life_events
    ADD CONSTRAINT fk_life_events_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: medication_doses fk_medication_doses_given_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.medication_doses
    ADD CONSTRAINT fk_medication_doses_given_by_user_id_users FOREIGN KEY (given_by_user_id) REFERENCES public.users(id);


--
-- Name: medication_doses fk_medication_doses_plan_id_medication_plans; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.medication_doses
    ADD CONSTRAINT fk_medication_doses_plan_id_medication_plans FOREIGN KEY (plan_id) REFERENCES public.medication_plans(id);


--
-- Name: medication_plans fk_medication_plans_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.medication_plans
    ADD CONSTRAINT fk_medication_plans_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: medication_plans fk_medication_plans_health_event_id_health_events; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.medication_plans
    ADD CONSTRAINT fk_medication_plans_health_event_id_health_events FOREIGN KEY (health_event_id) REFERENCES public.health_events(id);


--
-- Name: medication_plans fk_medication_plans_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.medication_plans
    ADD CONSTRAINT fk_medication_plans_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: merge_requests fk_merge_requests_requested_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.merge_requests
    ADD CONSTRAINT fk_merge_requests_requested_by_user_id_users FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id);


--
-- Name: milestones fk_milestones_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT fk_milestones_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: milestones fk_milestones_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT fk_milestones_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: observations fk_observations_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT fk_observations_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: observations fk_observations_health_event_id_health_events; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT fk_observations_health_event_id_health_events FOREIGN KEY (health_event_id) REFERENCES public.health_events(id);


--
-- Name: outcomes fk_outcomes_health_event_id_health_events; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT fk_outcomes_health_event_id_health_events FOREIGN KEY (health_event_id) REFERENCES public.health_events(id);


--
-- Name: outcomes fk_outcomes_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT fk_outcomes_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: outcomes fk_outcomes_recorded_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT fk_outcomes_recorded_by_user_id_users FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(id);


--
-- Name: pet_devices fk_pet_devices_linked_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_devices
    ADD CONSTRAINT fk_pet_devices_linked_by_user_id_users FOREIGN KEY (linked_by_user_id) REFERENCES public.users(id);


--
-- Name: pet_devices fk_pet_devices_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_devices
    ADD CONSTRAINT fk_pet_devices_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: pet_friends fk_pet_friends_accepted_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_friends
    ADD CONSTRAINT fk_pet_friends_accepted_by_user_id_users FOREIGN KEY (accepted_by_user_id) REFERENCES public.users(id);


--
-- Name: pet_friends fk_pet_friends_friend_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_friends
    ADD CONSTRAINT fk_pet_friends_friend_pet_id_pets FOREIGN KEY (friend_pet_id) REFERENCES public.pets(id);


--
-- Name: pet_friends fk_pet_friends_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_friends
    ADD CONSTRAINT fk_pet_friends_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: pet_friends fk_pet_friends_requested_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_friends
    ADD CONSTRAINT fk_pet_friends_requested_by_user_id_users FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id);


--
-- Name: pet_identifiers fk_pet_identifiers_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_identifiers
    ADD CONSTRAINT fk_pet_identifiers_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: pet_identifiers fk_pet_identifiers_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_identifiers
    ADD CONSTRAINT fk_pet_identifiers_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: pet_preferences fk_pet_preferences_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_preferences
    ADD CONSTRAINT fk_pet_preferences_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: pet_preferences fk_pet_preferences_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pet_preferences
    ADD CONSTRAINT fk_pet_preferences_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: pets fk_pets_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT fk_pets_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: pets fk_pets_household_id_households; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT fk_pets_household_id_households FOREIGN KEY (household_id) REFERENCES public.households(id);


--
-- Name: professional_links fk_professional_links_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.professional_links
    ADD CONSTRAINT fk_professional_links_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: professional_links fk_professional_links_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.professional_links
    ADD CONSTRAINT fk_professional_links_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: professional_links fk_professional_links_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.professional_links
    ADD CONSTRAINT fk_professional_links_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: recovery_plans fk_recovery_plans_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.recovery_plans
    ADD CONSTRAINT fk_recovery_plans_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: recovery_plans fk_recovery_plans_health_event_id_health_events; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.recovery_plans
    ADD CONSTRAINT fk_recovery_plans_health_event_id_health_events FOREIGN KEY (health_event_id) REFERENCES public.health_events(id);


--
-- Name: recovery_plans fk_recovery_plans_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.recovery_plans
    ADD CONSTRAINT fk_recovery_plans_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: relationships fk_relationships_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT fk_relationships_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: relationships fk_relationships_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT fk_relationships_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: relationships fk_relationships_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT fk_relationships_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: service_requests fk_service_requests_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT fk_service_requests_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: service_requests fk_service_requests_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT fk_service_requests_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: share_tokens fk_share_tokens_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT fk_share_tokens_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: share_tokens fk_share_tokens_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT fk_share_tokens_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: social_interactions fk_social_interactions_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_interactions
    ADD CONSTRAINT fk_social_interactions_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: social_interactions fk_social_interactions_friend_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_interactions
    ADD CONSTRAINT fk_social_interactions_friend_pet_id_pets FOREIGN KEY (friend_pet_id) REFERENCES public.pets(id);


--
-- Name: social_interactions fk_social_interactions_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_interactions
    ADD CONSTRAINT fk_social_interactions_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: social_profiles fk_social_profiles_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT fk_social_profiles_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: social_profiles fk_social_profiles_updated_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT fk_social_profiles_updated_by_user_id_users FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: social_reports fk_social_reports_friend_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_reports
    ADD CONSTRAINT fk_social_reports_friend_pet_id_pets FOREIGN KEY (friend_pet_id) REFERENCES public.pets(id);


--
-- Name: social_reports fk_social_reports_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_reports
    ADD CONSTRAINT fk_social_reports_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: social_reports fk_social_reports_reported_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.social_reports
    ADD CONSTRAINT fk_social_reports_reported_by_user_id_users FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id);


--
-- Name: training_goals fk_training_goals_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.training_goals
    ADD CONSTRAINT fk_training_goals_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: training_goals fk_training_goals_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.training_goals
    ADD CONSTRAINT fk_training_goals_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: training_sessions fk_training_sessions_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT fk_training_sessions_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: training_sessions fk_training_sessions_goal_id_training_goals; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT fk_training_sessions_goal_id_training_goals FOREIGN KEY (goal_id) REFERENCES public.training_goals(id);


--
-- Name: training_sessions fk_training_sessions_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT fk_training_sessions_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: transfer_requests fk_transfer_requests_from_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT fk_transfer_requests_from_user_id_users FOREIGN KEY (from_user_id) REFERENCES public.users(id);


--
-- Name: transfer_requests fk_transfer_requests_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT fk_transfer_requests_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: triage_assessments fk_triage_assessments_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.triage_assessments
    ADD CONSTRAINT fk_triage_assessments_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: triage_assessments fk_triage_assessments_health_event_id_health_events; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.triage_assessments
    ADD CONSTRAINT fk_triage_assessments_health_event_id_health_events FOREIGN KEY (health_event_id) REFERENCES public.health_events(id);


--
-- Name: vet_briefs fk_vet_briefs_generated_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.vet_briefs
    ADD CONSTRAINT fk_vet_briefs_generated_by_user_id_users FOREIGN KEY (generated_by_user_id) REFERENCES public.users(id);


--
-- Name: vet_briefs fk_vet_briefs_health_event_id_health_events; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.vet_briefs
    ADD CONSTRAINT fk_vet_briefs_health_event_id_health_events FOREIGN KEY (health_event_id) REFERENCES public.health_events(id);


--
-- Name: vet_briefs fk_vet_briefs_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.vet_briefs
    ADD CONSTRAINT fk_vet_briefs_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: welfare_observations fk_welfare_observations_created_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.welfare_observations
    ADD CONSTRAINT fk_welfare_observations_created_by_user_id_users FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: welfare_observations fk_welfare_observations_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.welfare_observations
    ADD CONSTRAINT fk_welfare_observations_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: welfare_profiles fk_welfare_profiles_pet_id_pets; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.welfare_profiles
    ADD CONSTRAINT fk_welfare_profiles_pet_id_pets FOREIGN KEY (pet_id) REFERENCES public.pets(id);


--
-- Name: welfare_profiles fk_welfare_profiles_updated_by_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: pli
--

ALTER TABLE ONLY public.welfare_profiles
    ADD CONSTRAINT fk_welfare_profiles_updated_by_user_id_users FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict VaHOudZoB0htbm0eLNaLZ6R5Qm7eSYc4gOFFy0J88mFm4C8WGeFyMR4QM3botz1

