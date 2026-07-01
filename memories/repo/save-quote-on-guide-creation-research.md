# Save-Quote-On-Guide-Creation — Research Insights

**Story:** `ai-research/save-quote-on-guide-creation-research.md`
**Updated:** 2026-06-30 — full GetQuoteData (11 fields), not just 4; admin endpoint gets `qAdj*` query param

## Non-obvious findings

- `QuoteData` entity fields (`qAdjMode`, `qBaseRef`, `qAdjFactor`, `qAdjBasis`, `qAdjSrcRef`, `service`, `courier`, `total`) are **dead** — `createGuide` only ever writes `{ quoteId }` (`guides-db.service.ts:81`). The new `QuoteSnapshot` nested schema replaces their logical slot. Zero migration risk since nothing writes to them.
- `typeService` is the **only** `GetQuoteData` field entirely absent from the entity — must be added.
- `RetryPayload` (`guides.interface.ts:40-92`) carries no quote fields; retry reads from stored doc. `quoteData.quote` survives retry **only if** future refactors avoid wholesale `quoteData` replacement — guard against `$set: { quoteData: {...} }`.
- `GetQuoteData.source` matches `Guide.provider` but both are stored separately — `source` in snapshot is an audit trail of what the quote said at creation time.
- `GetQuoteData.id` (the quote identifier) maps to `QuoteData.quoteId` on the entity. Two copies of the same value — recommend storing both, `quoteId` is canonical for provider calls, `id` in snapshot is the original quote identifier from the FE.
- `qAdj*` fields are sensitive margin config. `includeMarginDetails` query param on admin listing controls exposure — default `false` (safe by default, backward-compatible).