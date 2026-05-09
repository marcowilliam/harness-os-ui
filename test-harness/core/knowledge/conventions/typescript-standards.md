---
title: TypeScript Standards
tags: [typescript, code-style, linting]
concerns: [governance]
status: active
created: 2025-01-20
---

# TypeScript Standards

Enforced via ESLint + Prettier. No exceptions without a team discussion.

## Types over interfaces for unions

Use `type` for union types and derived types. Use `interface` when you expect extension via `implements` or `extends`.

```typescript
// Good
type PaymentStatus = 'pending' | 'completed' | 'failed';
type OrderWithUser = Order & { user: User };

// Good
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}
```

## No implicit any

`strict: true` is non-negotiable. If you need to escape the type system, use `unknown` + narrowing, not `any`.

## Return types on public functions

Always annotate return types on exported functions. Inference is fine inside a function body.

```typescript
// Good
export function calculateTotal(items: LineItem[]): Money { ... }

// Avoid — harder to read API surface
export function calculateTotal(items: LineItem[]) { ... }
```

## Error handling

Use `Result<T, E>` pattern for expected failures. Throw only for programmer errors (impossible states).

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```
