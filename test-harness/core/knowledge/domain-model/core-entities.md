---
title: Core Domain Entities
tags: [ddd, entities, aggregates]
concerns: [causal, relational]
status: active
created: 2025-01-08
---

# Core Domain Entities

The canonical model. When in doubt, start here.

## User

```
User
├── id: UUID
├── email: string (unique)
├── displayName: string
├── organizationId: UUID (FK)
├── role: UserRole (admin | member | viewer)
├── status: AccountStatus (active | suspended | deleted)
├── createdAt: Timestamp
└── lastActiveAt: Timestamp
```

User is not an aggregate root for anything beyond itself. Don't put order history on User.

## Organization

```
Organization
├── id: UUID
├── slug: string (unique, URL-safe)
├── name: string
├── plan: PlanTier (free | starter | pro | enterprise)
├── ownerId: UUID (FK → User)
└── settings: OrganizationSettings
```

Organization is the billing boundary. All subscription state lives here.

## Order

```
Order (Aggregate Root)
├── id: UUID
├── organizationId: UUID
├── status: OrderStatus
├── lineItems: LineItem[]
├── totalAmount: Money
├── placedAt: Timestamp
└── events: DomainEvent[]
```

LineItem is a value object — no independent identity. Orders are immutable after `Fulfilled` status.

## Money

Always use the `Money` value object. Never store amounts as floating point.

```typescript
type Money = { amount: number; currency: CurrencyCode }; // amount in smallest unit (cents)
```
