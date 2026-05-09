---
title: Notification System — Feature Map
tags: [notifications, email, in-app, webhooks]
concerns: [relational, causal]
status: active
created: 2025-04-05
---

# Notification System — Feature Map

## Channels

| Channel | Status | Owner |
|---|---|---|
| Email (transactional) | Live | Platform |
| Email (digest) | Live | Platform |
| In-app (bell icon) | Live | Frontend |
| Webhook | Beta | Platform |
| Slack integration | Planned | Integrations |
| Mobile push | Not started | Mobile |

## Template System

Templates are stored in the DB, not code. Edited via admin panel. Variables use `{{mustache}}` syntax.

Required variables per template are validated at send time — missing variables cause a hard failure, not a silent empty string.

## User Preferences

Every notification type has an opt-out. Users can opt out per channel per type. Organizations can suppress certain notification types for all their members.

## Delivery Guarantees

Transactional: at-least-once. Idempotency key = `{notificationType}:{entityId}:{recipientId}:{date}`. Duplicate sends within 24h are silently dropped.

Digest: exactly-once per digest window. Digest windows: daily 8am user-timezone.
