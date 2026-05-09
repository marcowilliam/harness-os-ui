---
title: Idempotency Key Pattern for Async Operations
tags: [async, events, kafka, reliability]
concerns: [causal, governance]
created: 2025-03-15
---

When processing domain events, always derive the idempotency key from the event itself — never generate a new UUID at processing time.

```typescript
const idempotencyKey = `${event.type}:${event.aggregateId}:${event.id}`;
```

Discovered after a Kafka consumer restart caused double-processing of 847 orders during the March incident. The events had already been published but the offset hadn't been committed. Processing was not idempotent — orders were created twice.

The fix: check the idempotency key in a Redis set before processing. If seen, ack and skip. This pattern now applies to all event consumers across all services.

Transferable to any system where you process messages that might be delivered more than once.
