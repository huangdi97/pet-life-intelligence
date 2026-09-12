# Pet Life Event Graph & Data Model

## 核心思想

业务的长期资产不是页面，而是“同一 Pet ID 下带来源的连续事件与 Outcome”。

## Canonical LifeEvent

```json
{
  "event_id": "uuid",
  "pet_id": "uuid",
  "event_type": "daily.meal",
  "occurred_at": "2026-09-13T08:00:00+08:00",
  "recorded_at": "2026-09-13T08:01:00+08:00",
  "actor_id": "uuid",
  "source_type": "OWNER_REPORTED",
  "source_ref": null,
  "provenance_level": "OWNER_REPORTED",
  "schema_version": "1.0.0",
  "payload": {},
  "artifact_ids": [],
  "supersedes_event_id": null,
  "retracted_at": null
}
```

## v0.1 Event namespace

- pet.created
- pet.media_added
- relationship.created
- grant.created
- grant.revoked
- consent.changed
- daily.meal
- daily.drink
- daily.elimination
- daily.walk
- daily.play
- daily.weight
- care.task_created
- care.task_completed
- care.task_conflict
- care.handoff_started
- care.handoff_ended
- care.card_issued
- behavior.observed
- health.event_opened
- health.observation_added
- health.triage_assigned
- health.vet_brief_generated
- medication.plan_created
- medication.administered
- medication.missed
- health.outcome_recorded
- artifact.added
- audit.accessed
- notification.created

## 核心关系

- Pet belongs to Household
- Actor has Relationship to Pet/Household
- Grant grants scoped capability
- LifeEvent belongs to Pet
- Artifact belongs to Event or Domain object
- Outcome closes a prior event/episode
- AuditEntry records access/change
