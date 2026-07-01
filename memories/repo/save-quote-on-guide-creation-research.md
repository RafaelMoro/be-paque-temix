# Save-Quote-On-Guide-Creation — Research Insights

**Story:** `ai-research/save-quote-on-guide-creation-research.md`
**Updated:** 2026-06-30 — clarified qAdj* access rules

## Non-obvious findings

- `qAdj*` fields (`qAdjMode`, `qBaseRef`, `qAdjFactor`, `qAdjBasis`, `qAdjSrcRef`) are **never** returned to non-admins. `GET /guides/db/:guideId` and `GET /guides/db` (non-admin) always strip them. Only `GET /guides/db/admin` can return them, and only when `?includeMarginDetails=true` (explicit opt-in, not default).
- `QuoteData` entity fields (`qAdjMode`, `qBaseRef`, `qAdjFactor`, `qAdjBasis`, `qAdjSrcRef`, `service`, `courier`, `total`) are **dead** — `createGuide` only ever writes `{ quoteId }` (`guides-db.service.ts:81`). The new `QuoteSnapshot` nested schema replaces their logical slot. Zero migration risk.
- `typeService` is the **only** `GetQuoteData` field entirely absent from the entity — must be added.
- `RetryPayload` (`guides.interface.ts:40-92`) carries no quote fields; retry reads from stored doc. `quoteData.quote` survives retry **only if** future refactors avoid wholesale `quoteData` replacement — guard against `$set: { quoteData: {...} }`.
- `GetQuoteData.source` matches `Guide.provider` — both stored separately as audit trail.
- `GetQuoteData.id` and `QuoteData.quoteId` are the same value but both stored — open question Q3 in research doc.
