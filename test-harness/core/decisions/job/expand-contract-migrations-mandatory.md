---
title: Expand-contract pattern mandatory for all schema migrations
rationale: After the Q4 2024 downtime incident, zero-downtime migrations are now non-negotiable. All schema changes must use the expand-contract pattern. DBA review is required before any migration that touches tables with >100k rows.
context: The Q4 incident was a NOT NULL column added with a backfill that locked the orders table for 4 hours. Revenue impact was significant. This decision eliminates that class of incident.
concern: governance
concerns: [governance, causal]
project: job
created: 2025-01-03
---
