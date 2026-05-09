---
title: Always Use Money Type for Amounts
triggers: [price, amount, cost, payment, currency, float, decimal]
priority: 1
status: active
concerns: [governance, causal]
appliesTo: [billing, orders, catalog]
---

Never store monetary amounts as float or plain number. Always use the `Money` value object.

```typescript
type Money = { amount: number; currency: CurrencyCode }; // amount in smallest unit (cents)
```

Floating-point rounding errors in billing caused a €0.01 discrepancy bug that took 3 days to trace in 2024-Q1. The Money type exists because of that incident.
