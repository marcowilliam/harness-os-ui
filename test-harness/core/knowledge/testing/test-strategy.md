---
title: Test Strategy
tags: [testing, unit, integration, e2e]
concerns: [governance, causal]
status: active
created: 2025-01-15
---

# Test Strategy

## Pyramid

```
         [E2E — Playwright]           ← few, slow, high confidence
      [Integration — real DB/queue]   ← medium, catches real bugs
   [Unit — pure functions, fast]      ← many, cheap, business logic
```

## Unit Tests

Target: pure functions, domain logic, value objects, utilities.
No mocks of your own code — if you need a mock, you have a boundary problem.
External dependencies (DB, APIs) are always mocked at unit level.

Coverage target: 80% line coverage on `src/domain/`. Not measured on controllers/infra.

## Integration Tests

Run against a real PostgreSQL (test schema, isolated per test run).
Run against real Kafka (test topic prefix).
No mock HTTP — use `nock` or real test doubles that implement the actual interface.

These are the tests that catch the real bugs. Invest here.

## E2E Tests

Playwright. Critical user journeys only:
- Sign up → onboard → place first order
- Subscription upgrade
- Payment failure + recovery

E2E tests own a dedicated staging environment. They run on every deploy to staging, not on every PR.

## What Not to Test

- Framework glue code (express middleware, ORM mappings)
- Generated code
- Configuration files
