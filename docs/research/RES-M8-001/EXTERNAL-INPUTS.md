# EXTERNAL-INPUTS

## Why This Exists

Future worlds may ingest:

- Human actions
- External APIs
- Real weather
- Market data
- Messages

These break pure re-simulation **unless recorded as deterministic inputs**.

## Principle

> Replay must not re-query “当时天气” from the internet.

External influence enters history only as a **recorded fact / envelope**, then Kernel commits consequences.

## ExternalInputEnvelope (research shape)

```text
ExternalInputEnvelope {
  inputId
  worldId
  sourceKind          # HUMAN | API | MARKET | WEATHER | MESSAGE | SYSTEM
  sourceRef
  observedAtWallTime  # audit only
  occurredAtWorldTime # world mapping
  payload             # versioned, schema-validated
  schemaVersion
  contentDigest
  correlationId
}
```

Rules:

1. Envelope is durable **before** dependent world effects.
2. World effects still go through Kernel ActionRequest/outcome/events.
3. Replay consumes the envelope as ordered input — never the live API.
4. Wall time in envelope is audit metadata, not domain time authority.

## Human Actions

Already the main external input:

```text
Human UI → ActionRequest(requestedBy=HUMAN) → Kernel → Outcome/Events
```

Product presence (open app) is **not** an external world input (P14).

## Real-World Connection Stance (M8 v1)

- World must have **internal continuity** without real-world APIs.
- Real weather/markets are optional fact sources.
- Offline catch-up must work with zero external feeds.

## Determinism Boundary

| Input class | Replay rule |
| ----------- | ----------- |
| None | Pure seed + events |
| Human actions | Already in ActionRequest/outcome/events |
| External APIs | Must be envelope-recorded |
| LLM outputs | **Never** sole truth; intents only, validated into ActionRequest |

## Anti-Patterns

| Pattern | Problem |
| ------- |---------|
| Catch-up calls weather API for past 30 days | Non-deterministic; may fail |
| LLM “guesses” market moves | Fake history |
| Unrecorded cron into Kernel | Unreplayable |

## M8 Position

Define the envelope contract direction. Do not implement external market/weather pipes. M8 v1 scenarios use zero or fully recorded inputs.
