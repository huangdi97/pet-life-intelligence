# MULTI_CLIENT_EXPERIENCE_MATRIX — R5.6 Capability-aware Owner Parity

> Authority: canonical v3.4-R1 + L2 Feature Inventory + R5.5/R5.6.
> Status: SOURCE DESIGN CLOSED / runtime evidence pending.
> “Full” means complete owner-facing information/state/action semantics on that client; it does not imply unavailable hardware or external dependencies are magically present.

## Cross-client matrix

| Experience | Web | Mini | Android/Mobile | Admin | Professional |
|---|---|---|---|---|---|
| Today | Full | Full compact | Full | — | — |
| Timeline | Full | Full compact | Full | View | View |
| Quick Log | Full | Full compact | Full | — | — |
| Pet World | Full | Full compact | Full | — | View |
| Interactive high-fidelity Twin | Full | **Unavailable locally; status/route only** | Full | — | — |
| Life View | Full interactive | Lightweight/status | Full interactive | — | — |
| Twin Capture | Full | Guided/lightweight where supported | Full | — | — |
| Twin Review | Full | Route/status where local 3D unavailable | Full | — | — |
| Twin Versions | Full | View/status | Full | Audit | — |
| Health | Full | Full compact | Full | Audit | Full |
| Health Detail | Full | View/compact | Full | Audit | Full |
| Medication | Full | Full compact | Full | — | Full |
| Vet Brief | Full | View/share where supported | Full | — | Full |
| Care / Handoff | Full | Full compact | Full | Audit | Full |
| Behavior | Full | Full compact | Full | — | Full (ABC explicit) |
| Training | Full | Full compact | Full | — | Full |
| Welfare | Full | Full compact | Full | — | — |
| Social | Full | Full compact | Full | — | — |
| Monitoring | Full truthful state | Compact truthful state | Full truthful state | Device audit | — |
| Companion | Full capability-aware | Compact capability-aware | Full capability-aware | — | — |
| Assistant | Full | Full compact | Full | — | — |
| Notifications | Full | Full compact | Full | — | — |
| Me / Settings | Full | Full compact | Full | — | — |
| Platform / Flags | — | — | — | Full | — |

## Canonical parity rules

1. Primary owner IA is always Today / Timeline / Pet / Assistant / Me.
2. Compact clients reduce density, not safety/provenance/state truth.
3. Mini never fakes local high-fidelity 3D; it exposes Twin status/version and routes interactive review to capable clients.
4. Monitoring distinguishes connected/offline/no-device/cached/permission/error.
5. Companion does not expose prototype flags or fake hardware execution in owner UI.
6. Health remains read-first and never fabricates diagnosis.
7. Welfare is evidence-first; Social is relationship-first; Care is scoped/time-bounded.
8. Shared DTO/schema comes from the repository contracts, not client-specific invention.
9. Human Visual Acceptance remains independent from functional parity.

## Evidence required for final acceptance

Fresh post-final-source contact sheets:

- Web: Today / Timeline / Pet / Life View / Twin Review / Health / Assistant / Me
- Android: same eight surfaces
- Mini: Today / Timeline / Pet / Health / Assistant / Me
- Doudou and Mimi turntables on capable runtime
- representative Empty / Attention / Offline / Not Found / Permission states

Missing required source images must fail evidence generation rather than silently rendering placeholders.
