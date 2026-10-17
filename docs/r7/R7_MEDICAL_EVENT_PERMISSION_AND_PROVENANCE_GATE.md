# R7: Medical event privacy & trusted provenance

**Scope:** implementation on PR #2 only, Android first, no main/Release/baseline/visual promotions.

## Confirmed vulnerability in the prior version

- `health.event_opened` stores `chief_complaint` directly in a `LifeEvent.payload`.
- Domain health endpoints require medical:read/medical:write; generic LifeEvent list, single-event, Today and Life Replay originally checked only daily:read.
- A short-lived caregiver delegated daily:read could read medical payloads, even without medical:read.
- Generic daily:write could also append an event classified as clinical, and untrusted caller-provided source/provenance values were not restricted to owner/caregiver reports.

## Code-level mitigation

1. `MEDICAL_EVENT_TYPES` is calculated from canonical `EVENT_REGISTRY` domains health and medication, including nonprefix types such as `ai.observation`.
2. Every generic event reading surface checks user capabilities. For daily-only readers, filter sensitive records in SQL **before pagination and serialization**, and on both the day event query and any following correction-chain queries. Exact sensitive event ID requires medical:read.
3. Manual generic event writers cannot write health/medication domain event types. They must use specialized domain APIs enforcing medical:write, clinical schema and audits.
4. Manual event writes may claim only OWNER_REPORTED/CAREGIVER_REPORTED, and must not override `provenance_level` to imply professional, lab, AI, device or system verification. Trusted internal adapters retain validated high-level source types.
5. Integration regressions verify a daily-only caregiver can read normal life events and append their own daily event, but cannot see a clinical complaint in `events`, `today`, `life-replay`, filtered list or direct ID.

## Remaining product-security boundaries

- The source label OWNER_REPORTED versus CAREGIVER_REPORTED needs server-side role attribution; today it is still client-selected within those two trusted-low categories.
- Free-text diary and nonclinical domain entries may themselves contain sensitive details; finer-grained consent and data classification will require their own policy.
- Multi-domain event correction chains and artifact-backed clinical media demand an additional privacy audit.
- Android runtime must be checked on a real emulator/phone with daily-only and medical-readable profiles.
- `NO_VISION_MODEL_USED = TRUE` · `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

## Manual event fabric additional hardening

Only direct daily.* quick logs are permitted through generic user append. `milestone.recorded` must be created through `/milestones` so the actual historical Milestone entity exists. Privileged status/consent/grant/system/behavior/medical events use their dedicated APIs. A daily caregiver who uses older clients sending default OWNER_REPORTED is server-normalized to CAREGIVER_REPORTED based on owner relationship checks; any explicitly contradictory high provenance marker is rejected. Attached `artifact_ids` are now verified against the same active pet, non-deleted, non-sensitive IMAGE/VIDEO media; cross-pet and medical-sensitive uploads cannot be published as ordinary life-event evidence. Future fine-grained privacy policies for free-text and nonstandard media remain separate gates.
