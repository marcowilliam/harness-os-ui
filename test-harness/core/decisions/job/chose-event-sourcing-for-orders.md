---
title: Chose event sourcing for Orders aggregate
rationale: Orders need a complete audit trail for legal and finance reconciliation. Event sourcing gives us the full history for free and enables temporal queries (what was the order state at time T?). The extra complexity is worth it for this specific aggregate.
context: Evaluated CQRS with traditional DB snapshots as an alternative. Rejected because snapshot consistency became complex when replaying partial histories for reconciliation queries.
concern: causal
concerns: [causal, governance]
project: job
created: 2025-03-08
---
