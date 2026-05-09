---
title: PR Process and Review Standards
tags: [git, pull-request, code-review, ci]
concerns: [governance, relational]
status: active
created: 2025-02-01
---

# PR Process and Review Standards

## PR Size

Keep PRs under 400 lines changed. If you're above that, split by:
1. Refactor first (no behavior change) → PR 1
2. Feature on top → PR 2

Never mix refactor with feature in the same PR.

## Branch Naming

`{type}/{ticket-id}-{short-description}`

Types: `feat`, `fix`, `refactor`, `chore`, `docs`

Example: `feat/PAY-412-subscription-pause`

## Required Checks

All must pass before merge:
- [ ] CI (lint + typecheck + unit tests)
- [ ] Integration tests on staging branch
- [ ] At least 1 approval (2 for changes to core services)
- [ ] No unresolved comments

## Review SLA

- Author: respond to comments within 1 business day
- Reviewer: first pass within 1 business day of request
- If blocked: escalate in #eng-review, don't let PRs sit

## Merge Strategy

Squash merge into main. One commit per PR. The squash commit message is the PR title — make it meaningful.

No force pushes to main, ever. If you need to revert, create a revert PR.
