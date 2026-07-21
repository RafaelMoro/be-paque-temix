# Balance feature - planning decisions

Captured while converting `ai-research/balance-feature-research.md` into the implementation plan.

- Store wallet and request amounts as integer `amountInCents`; expose decimal `amount` only through DTOs and emails. This avoids repeated floating-point `$inc` drift while preserving two-decimal truncation.
- Approval requires a MongoDB transaction: the conditional pending-to-approved request update and wallet credit must commit or roll back together.
- Only `POST /guides/db/create` spends balance. Direct provider routes and `updateGuideData` remain unchanged.
- `?mock=success|failed` persisted guide creation bypasses both balance precheck and debit by stakeholder decision.
- Admin `paymentReference` is required only for approval. Request owners can see `decisionReason`, but never `adminInCharge`.
- Persist a guide as `waiting` before guarded debit/provider execution. Commit debit plus an internal `balanceChargeStatus: 'debited'` marker in one transaction. Concurrent insufficient balance becomes failed/`insufficient`; mock guides are `bypassed`; only charged new failures (plus legacy marker-less failed guides) may retry without another charge.
- Keep `UpdateGuideDto.quote` behavior unchanged. Add a create-only quote DTO that requires finite, positive `quote.total` for the balance charge.

Plan: `ai-planning/planning-balance-feature.md`.
