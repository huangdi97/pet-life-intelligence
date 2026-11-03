# PLI R8BU · Private agent-interaction history gate

## Finding

`POST /pets/{id}/ask` is intentionally usable by a daily reader, but the
endpoint also appends a `pet.asked` LifeEvent whose payload stores a truncated
question and citations. The event registry classifies it as domain `agent`.
Before R8BU, that domain was neither medical nor manager-private, so another
daily-only caregiver could discover an owner's archived question through the
generic event fabric or Search.

A person's AI question can itself contain private health, household or care
context even when the answer is nonclinical. Collaboration permission to *ask a
new question* is not permission to read another person's interaction history.

## Rule

Generic LifeEvent visibility now treats domain `agent` like
identity/platform/finance: archived agent-interaction events require
`manage:pet`. This does not disable the Ask endpoint for daily readers and does
not alter the immediate answer/citation boundary. It only prevents generic
history reads from downgrading interaction privacy.

## Regression

Owner asks a unique private question → owner can inspect its `pet.asked`
LifeEvent → daily-only sitter gets no event list/search/direct-ID access → sitter
can still call Ask for their own current question.

Exact-HEAD Ruff, pytest, migration replay, OpenAPI, Browser and Android gates
remain required. No merge, release, tag or visual-baseline promotion.
`NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`.
