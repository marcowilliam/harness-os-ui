---
title: Chose PostgreSQL over MongoDB for core data
rationale: Our domain has strong relational constraints (organizations own users, users own orders, orders reference catalog items). MongoDB's flexibility would have required us to enforce those constraints in application code — which is where consistency bugs live. PostgreSQL's foreign keys and transactions match our actual data model.
context: MongoDB was proposed for flexibility during rapid schema changes. We rejected it after modeling the domain — the schema was actually stable, the uncertainty was in the product requirements, not the data model.
concern: causal
concerns: [causal, governance]
project: job
created: 2025-01-12
---
