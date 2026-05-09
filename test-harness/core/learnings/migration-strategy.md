---
title: Zero-Downtime Migration Strategy
tags: [database, migration, postgres, deployment]
concerns: [causal, governance]
created: 2025-02-20
---

Never add a NOT NULL column without a default in a single migration on a live table. PostgreSQL locks the table for the full backfill.

The safe pattern (expand-contract):

1. Add column as nullable, no default
2. Deploy code that writes to both old and new column
3. Backfill existing rows in batches (1000 rows, sleep 50ms between)
4. Add NOT NULL constraint + default after backfill complete
5. Deploy code that reads from new column only
6. Drop old column in a separate migration (next sprint)

This pattern cost us 4 hours of downtime in Q4 2024 before we learned it. Now it's step 1 of every schema change review.

Works on any RDBMS with row-level locking semantics.
