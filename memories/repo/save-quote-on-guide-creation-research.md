# Save-Quote-On-Guide-Creation — Research Insights

**Story:** `ai-research/save-quote-on-guide-creation-research.md`
**Updated:** 2026-06-30 — all 5 open questions resolved

## Resolved Decisions

- Query param: `includeInternalPricing` (admin listing only, default `false`)
- `qAdj*` never returned to non-admins; admin gets them only when `includeInternalPricing=true`
- `QuoteData` entity becomes `{ quote?: QuoteSnapshot }` — no separate `quoteId` field
- `source` NOT stored — `Guide.provider` is authoritative
- No admin mode for single-guide GET endpoint

## Non-obvious findings

- Existing `QuoteData` fields (`qAdjMode`, `qBaseRef`, `qAdjFactor`, `qAdjBasis`, `qAdjSrcRef`, `service`, `courier`, `total`, `quoteId`) are **dead** — `createGuide` only ever writes `{ quoteId: payload.quoteId }`. New `QuoteSnapshot` replaces their slot. Zero migration risk.
- `typeService` is the only `GetQuoteData` field entirely absent from the entity. Must be added.
- `RetryPayload` (`guides.interface.ts:40-92`) carries no quote fields; retry reads from stored doc. `quoteData.quote` survives retry **only if** future refactors avoid wholesale `quoteData` replacement — guard against `$set: { quoteData: {...} }`.
- **Breaking API change:** `CreateGuideDto` drops top-level `quoteId: string`; client sends `quote.id` instead. `callProviderApi` references `payload.quoteId` → must change to `payload.quote?.id`.
- `source` intentionally excluded from snapshot — avoids duplicating `Guide.provider`.
- `QuoteSnapshot.id` is the quote identifier used by the provider API call. No separate `quoteId` on the entity.
