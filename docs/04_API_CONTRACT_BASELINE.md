# API Contract Baseline

Base: `/api/v1`

## System
- `GET /health`
- `GET /ready`

## Pets
- `POST /pets`
- `GET /pets`
- `GET /pets/{pet_id}`
- `PATCH /pets/{pet_id}`

## Events
- `POST /pets/{pet_id}/events`
- `GET /pets/{pet_id}/events`
- `GET /events/{event_id}`
- `POST /events/{event_id}/retract`

Headers:
- `Idempotency-Key`
- `X-Request-ID`

## Today
- `GET /pets/{pet_id}/today`

## Tasks
- `POST /pets/{pet_id}/tasks`
- `POST /tasks/{task_id}/complete`
- `GET /pets/{pet_id}/tasks`

## Care
- `POST /pets/{pet_id}/handoffs`
- `POST /handoffs/{id}/end`
- `POST /pets/{pet_id}/care-cards`
- `GET /care-card/{token}`

## Behavior
- `POST /pets/{pet_id}/behavior-events`

## Health
- `POST /pets/{pet_id}/health-events`
- `POST /health-events/{id}/answers`
- `POST /health-events/{id}/observations`
- `POST /health-events/{id}/triage`
- `POST /health-events/{id}/vet-brief`
- `POST /health-events/{id}/outcomes`

## Medication
- `POST /pets/{pet_id}/medication-plans`
- `POST /medication-plans/{id}/administrations`

## Consent / Grant
- `GET /pets/{pet_id}/grants`
- `POST /pets/{pet_id}/grants`
- `DELETE /grants/{grant_id}`
- `GET /pets/{pet_id}/consents`
- `PUT /pets/{pet_id}/consents/{purpose}`

## Media
推荐：
1. create artifact
2. presigned upload
3. confirm hash/metadata
4. attach to Event

## Error envelope

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Readable user-facing message",
    "request_id": "..."
  }
}
```
