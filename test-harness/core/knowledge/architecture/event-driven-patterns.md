---
title: Event-Driven Architecture Patterns
tags: [events, messaging, async, kafka]
concerns: [causal, governance]
status: active
source: architecture sessions
created: 2025-03-10
---

# Event-Driven Architecture Patterns

Core patterns used across the platform for async communication between services.

## Domain Events

All state changes are published as domain events. Events are named in past tense:
- `OrderPlaced`, `PaymentProcessed`, `UserDeactivated`
- Events carry the full aggregate state at time of emission
- Consumers must be idempotent — the same event may arrive more than once

## Event Schema

```json
{
  "id": "uuid",
  "type": "OrderPlaced",
  "aggregateId": "order-123",
  "aggregateType": "Order",
  "timestamp": "ISO-8601",
  "payload": {},
  "version": 1
}
```

## Kafka Topic Conventions

- Topic naming: `{domain}.{entity}.{event}` → `payments.order.placed`
- One consumer group per bounded context
- Dead letter queues for all topics: `{topic}.dlq`
- Retention: 7 days for operational events, 90 days for audit events

## When Not to Use Events

Events are wrong when you need synchronous confirmation. Use REST/gRPC when:
- The caller needs the result to continue
- The operation must be atomic with the request
- You need immediate error feedback
