---
title: Feature Flag Discipline — Flags Are Technical Debt
tags: [feature-flags, launchdarkly, deployment, technical-debt]
concerns: [governance, metacognitive]
created: 2025-04-01
---

Every feature flag added is technical debt with an expiry date. The team learned to treat flags as temporary by default.

Rules that emerged from accumulating 60+ stale flags:

1. Every flag gets a removal ticket created at the same time it's added
2. Flag naming: `{team}-{feature}-{date}` → `billing-pause-subscription-2025-03`
3. Flags older than 90 days with >99% rollout are removed in the next sprint — no discussion needed
4. Flags are never used for permanent configuration — that's what config files are for

The metacognitive part: we ran a retrospective and noticed our flag count directly correlated with how uncertain we felt about releases. High flag count = low deployment confidence = signal to invest in test coverage and feature isolation, not more flags.
