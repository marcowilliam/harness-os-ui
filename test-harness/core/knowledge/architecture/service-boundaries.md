---
title: Service Boundary Guidelines
tags: [microservices, ddd, bounded-context]
concerns: [governance, causal]
status: active
created: 2025-02-14
---

# Service Boundary Guidelines

How we decide where one service ends and another begins.

## Rule: own your data

Each service owns its database. No service reads another service's DB directly — ever. If you need data from another domain, you either:
1. Call its API
2. Subscribe to its events and maintain a local read model

## Bounded Context Mapping

Current bounded contexts and their owners:

| Context | Team | Primary entities |
|---|---|---|
| Identity | Platform | User, Organization, Permission |
| Billing | Finance Eng | Subscription, Invoice, Payment |
| Catalog | Product | Item, Category, Inventory |
| Orders | Commerce | Order, LineItem, Fulfillment |
| Notifications | Platform | Template, Delivery, Preference |

## Seams

Anti-corruption layers live at the seams. When Catalog entities appear in Orders context, they are translated to Order-local representations. The Order service does not import Catalog domain objects.

## Red flags

- "I just need to add one column to the users table" — stop, this is a boundary violation
- Circular dependencies between services — indicates wrong boundary placement
- A service that only exists to proxy another — merge them
