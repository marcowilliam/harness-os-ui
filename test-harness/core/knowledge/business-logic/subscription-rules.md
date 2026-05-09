---
title: Subscription Lifecycle Rules
tags: [billing, subscription, state-machine]
concerns: [causal, governance]
status: active
created: 2025-03-22
---

# Subscription Lifecycle Rules

## State Machine

```
free → trial → active → past_due → suspended → cancelled
                  ↓
               paused → active
```

- `free → trial`: triggered by organization creation, 14-day window
- `trial → active`: payment method added + first charge succeeds
- `active → past_due`: charge fails after 3-day grace period
- `past_due → suspended`: after 7 days unpaid
- `suspended → cancelled`: after 30 days suspended (automated)
- `active → paused`: user-initiated, max 3 months, keeps data

## Downgrade Rules

Downgrades take effect at end of billing period, never immediately. If the current usage exceeds the new plan limits at the time of downgrade:
- Excess seats are deactivated (oldest first)
- Excess storage is flagged but not deleted (30-day grace)

## Proration

Upgrades: prorated immediately, charge difference today.
Downgrades: prorated at next billing date (credit applied).

## Failed Payments

Retry schedule: +1 day, +3 days, +7 days. On 3rd failure, move to `past_due` and notify the organization owner.
