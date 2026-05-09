---
title: No Cross-Service DB Access
triggers: [database, query, sql, repository]
priority: 1
status: active
concerns: [governance, security]
appliesTo: [all]
---

Never query another service's database directly. Every service owns its data exclusively.

If you need data owned by another service:
1. Use that service's public API
2. Subscribe to its domain events and maintain a local read model

Violations here have caused production incidents — the catalog team added an index and broke the orders service query in 2024-Q3.
