# Save-Quote-On-Guide-Creation — Research Insights

**Story:** `ai-research/save-quote-on-guide-creation-research.md`

## Non-obvious findings

- `Guide.quoteData` (`src/guides/entities/guide.entity.ts:37-48`) declares loose `service`, `courier`, `total`, and `qAdj*` props, but `createGuide` only ever writes `{ quoteId }` (`guides-db.service.ts:81`). The loose quote fields are dead schema — adding a new nested `quote` subdoc for the same data creates a duplication landmine. Decision: keep both (additive, no migration), but flag the loose props for a later cleanup.
- `RetryPayload` (`guides.interface.ts:40-92`) does not carry the quote snapshot, and `retryFailedGuide`'s `$set` only touches `status`/`externalId`/`labelUrl`/`retries.*` — so a new `quoteData.quote` subdoc survives retries untouched *only if* no future refactor wholesale-replaces `quoteData`. Guard against `$set: { quoteData: {...} }`.
- `typeService` (`quotes.interface.ts:30`, type `QuoteTypeSevice = 'standard' | 'nextDay' | null`) is the one field on `GetQuoteData` not represented on `QuoteData` at all — it must be added on the entity, not just populated.
- `POST /quotes` is transient (no persistence) and the FE is the source of the selected quote. `quoteId` is opaque to the BE; the provider API receives it but the snapshot fields are DB-only. Do not send the snapshot to the provider.
- `GetQuoteData.source` duplicates `Guide.provider` — intentionally excluded from the snapshot to avoid storing the same value twice.