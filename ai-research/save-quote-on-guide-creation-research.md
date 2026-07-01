# Save Selected Quote Data on Guide Creation — Research

## Story Definition

### Title
Persist the selected quote snapshot (service, courier, total, typeService) on the guide created by `POST /guides/db/create`.

### Description
Today `POST /guides/db/create` (`src/guides/controllers/guides-db.controller.ts:44-53`) only persists `quoteId` on the `Guide.quoteData` subdocument (`src/guides/services/guides-db.service.ts:81`). The other `QuoteData` fields declared on the entity (`service`, `courier`, `total`, and the `qAdj*` margin fields — `src/guides/entities/guide.entity.ts:37-48`) are never populated, and `typeService` is missing entirely.

The client already receives the full quote list from `POST /quotes` (`src/quotes/controllers/quotes.controller.ts:14-26`), where each `GetQuoteData` item carries `id`, `service`, `total`, `courier`, `typeService`, `source` and the `qAdj*` margin breakdown (`src/quotes/quotes.interface.ts:16-33`). The user picks one quote and — after this change — will send the picked quote's data along with `quoteId` to `POST /guides/db/create`. The server must save a snapshot of those fields inside the guide document so the quote used at creation time can be audited later without re-calling the provider.

Quotes are **not** persisted in the BE; the FE is the source of the selected quote data for guide creation. No new quotes collection or provider re-fetch is in scope.

### Acceptance Criteria
1. `POST /guides/db/create` accepts the selected quote's `service`, `courier`, `total`, and `typeService` alongside the existing `quoteId`.
2. The `Guide` entity stores a `quote` subdocument (under `quoteData`) containing `service`, `total`, `typeService`, and `courier`, persisted on guide creation.
3. The persisted values are returned in the `GuideResponseDto` (so `GET /guides/db/:guideId` and the create/retry/update responses expose the saved quote snapshot).
4. `UpdateGuideDto` (used by `PATCH /guides/db/:guideId`) accepts the same quote fields and updates the stored `quote` subdocument when a new `quoteId` is provided.
5. Retry (`POST /guides/db/:guideId/retry`) preserves the existing stored quote snapshot; it must not wipe `quoteData.quote` when re-calling the provider.

### Out of scope
- Persisting quotes in MongoDB.
- Re-fetching the quote from the provider by `quoteId`.
- Backfilling `qAdj*` margin fields (`qAdjMode`, `qAdjBaseRef`, `qAdjFactor`, `qAdjBasis`, `qAdjSrcRef`) — they remain on the schema but are not populated by this story.
- Changing the `POST /quotes` response shape.

---

## Technical Research

### Affected files and modules

| File | Change |
| --- | --- |
| `src/guides/entities/guide.entity.ts` | Add `typeService` + a nested `quote` subdoc on `QuoteData` (or a new `QuoteSnapshot` class). Lines 37-48. |
| `src/guides/dtos/guides-db.dto.ts` | Extend `CreateGuideDto` (lines 219-248) and `UpdateGuideDto` (lines 250-279) with the four quote fields (or a nested `QuoteSnapshotDto`). |
| `src/guides/dtos/guides-db-responses.dto.ts` | Add the saved quote snapshot to `GuideDataDto` (lines 35-99) so it surfaces in `GuideResponseDto`. |
| `src/guides/services/guides-db.service.ts` | `createGuide` (lines 51-104): write the FE-supplied quote fields into `quoteData.quote` instead of `{ quoteId: payload.quoteId }`. `updateGuideData` (lines 338-413): write merged quote fields on `quoteId` change. `formatGuideResponse` (lines 859-951): expose the stored snapshot. |
| `src/guides/guides.interface.ts` | If `RetryPayload` needs the quote fields, add them; otherwise leave. |
| `src/quotes/quotes.interface.ts` | Reference only — `GetQuoteData` is the shape the FE mirrors back. |
| Tests: `src/guides/**/*.spec.ts`, `src/guides/controllers/guides-db.controller.spec.ts` (if present) | Update mocks to include the new fields. |

### Existing patterns to follow

- **Nested DTOs with `@ValidateNested()` + `@Type()`** — `CreateGuideDto` already nests `ParcelDto` and `CreateGuideAddressDto` (`src/guides/dtos/guides-db.dto.ts:229-242`). The quote snapshot should follow the same `@ApiProperty({ type: QuoteSnapshotDto })` + `@ValidateNested()` + `@Type(() => QuoteSnapshotDto)` pattern.
- **Nested `@Schema({ _id: false })` subdocuments on the entity** — `Address`, `Parcel`, `QuoteData`, `RetryAttempt`, `Comment` all use this (`src/guides/entities/guide.entity.ts:4-71`). A `QuoteSnapshot` class should match.
- **DTOs are the source of truth** — per AGENTS.md / IMPLEMENTATION_GUIDELINES, response types should be derived from the DTO, not duplicated. `FormattedGuideData = GuideDataDto` already exists (`src/guides/guides.interface.ts:99`); adding fields to `GuideDataDto` automatically flows into `FormattedGuideData`.
- **Service return envelope** — `formatGuideResponse` already returns the `GeneralResponse` shape; only its `data` construction needs the new fields.
- **Error handling** — `createGuide` and `updateGuideData` already wrap in try/catch and convert to `KraftError`. New field reads are not async, so no new error codes are needed; reuse existing `CONST.GDE_BDN_001` / `CONST.GDE_BDN_012`.
- **Param destructuring for >3 params** — per copilot-instructions.md, use object destructuring when adding methods that exceed 3 params. Existing `createGuide(user, payload)` stays at 2 params; no change needed there.

### Dependencies and integration points

- **FE ↔ BE contract**: FE must send the four quote fields. The `POST /quotes` response (`GetQuoteData`) is the shape FE will mirror; `id` becomes `quoteId`, and `service`/`courier`/`total`/`typeService` are forwarded as-is. `source` is already captured separately as `Guide.provider` and is **not** part of the quote snapshot to avoid duplication.
- **Provider calls are unaffected**: `callProviderApi` (`guides-db.service.ts:670-695`) only uses `payload.quoteId` and address/parcel data. The provider does not receive the quote snapshot — it stays internal to the DB record.
- **Retry flow**: `retryFailedGuide` (lines 152-216) builds a `RetryPayload` from the stored guide and re-calls the provider. It does not currently touch `quoteData` beyond `quoteId`; the new `quote` subdoc must survive the `$set` writes in retry (only `status`, `externalId`, `labelUrl`, `retries.*` are set, so `quoteData.quote` is untouched by existing retry logic — verify the `$set` does not overwrite the whole `quoteData` object).
- **Update flow**: `updateGuideData` (lines 338-413) already writes `quoteData.quoteId` via dot-notation (`setFields['quoteData.quoteId'] = dto.quoteId`). The quote snapshot fields should use the same dot-notation (`quoteData.quote.service`, etc.) so partial updates don't clobber the rest of `quoteData`.

### Proposed data shape

Entity (`guide.entity.ts`), new nested class — additive, mirrors `GetQuoteData` subset:

```typescript
@Schema({ _id: false })
class QuoteSnapshot {
  @Prop() service?: string;
  @Prop() total?: number;
  @Prop() typeService?: 'standard' | 'nextDay' | null;
  @Prop() courier?: string | null;
}

// Inside QuoteData, add:
@Prop({ type: QuoteSnapshot }) quote?: QuoteSnapshot;
```

DTO (`guides-db.dto.ts`), new `QuoteSnapshotDto` with `@IsString()` + `@IsNumber()` + `@IsEnum(['standard','nextDay'])` + `@IsOptional()` validators, nested on `CreateGuideDto` and `UpdateGuideDto` (optional on update).

Response (`guides-db-responses.dto.ts`): add `quote?: QuoteSnapshotResponseDto` to `GuideDataDto`.

> **Decision needed** (open question Q1): the four fields already exist *loose* on `QuoteData` (`service`, `courier`, `total`) — the user explicitly asked to nest them under a new `quote` prop. That leaves the old `service`/`courier`/`total` props on `QuoteData` unused and duplicative. Options: (a) keep both for backward compat (additive only), (b) remove the old loose props and migrate. Recommend (a) for this story to avoid a migration; flag for sign-off.

### Edge cases and constraints

- **FE sends no quote fields** (legacy client): the snapshot is `undefined`/missing on the doc. `formatGuideResponse` must handle missing `quoteData.quote` gracefully (return `null` or omit the prop), matching how `origin`/`destination` already use conditional spreads.
- **`typeService` is nullable**: `GetQuoteData.typeService` is `QuoteTypeSevice | null` (`quotes.interface.ts:30`). The DTO/entity must allow `null`, not just `undefined`.
- **`courier` is nullable**: same — `QuoteCourier | null` (`quotes.interface.ts:31`).
- **`total` precision**: `GetQuoteData.total` is `number` and margin math rounds to 2 decimals (`quotes.utils.ts:33-34`). Stored as-is; no re-computation server-side (FE is source).
- **Validation trust boundary**: per ponytail/maintenance rules, input validation at the trust boundary stays. The `QuoteSnapshotDto` must validate types so a malformed FE payload does not corrupt the doc. Do **not** trust the FE beyond shape validation — but do not re-fetch the quote either (user decision).
- **`UpdateGuideDto` partial updates**: when only `quoteId` changes, the FE may or may not resend the snapshot. Decide whether quote fields are required when `quoteId` changes (open question Q2) or always optional (simplest).
- **Retry does not pass quote fields**: `RetryPayload` (`guides.interface.ts:40-92`) lacks them. Retry reads from the stored guide and never overwrites `quoteData.quote` — confirm no `$set: { quoteData: {...} }` wholesale-replace sneaks in.

---

## Open Questions

1. **Duplicate fields on `QuoteData`**: the entity already has loose `service`, `courier`, `total` props (unused). Keep both (additive, no migration) or remove the loose ones and migrate existing docs? **Recommend: keep both; removal is a separate cleanup story.**
2. **`UpdateGuideDto` quote-field requirements**: when `quoteId` changes on `PATCH /guides/db/:guideId`, are the quote snapshot fields required (since they describe the new quote) or always optional? **Recommend: optional — if absent, keep existing snapshot; FE is trusted to send them when the quote changes.**
3. **`typeService` enum values**: `QuoteTypeSevice = 'standard' | 'nextDay'` (`quotes.interface.ts:6`). Confirm the FE only ever sends these two values; if providers can emit others, the entity/DTO should stay permissive (`@IsString()` + `@IsOptional()`) rather than `@IsEnum`.
4. **Backward-compat for existing `GuideResponseDto` consumers**: adding a `quote` field to `GuideDataDto` is additive; confirm no FE consumer breaks on the new prop.

---

## Assumptions

- The FE is the sole source of the selected quote's `service`/`courier`/`total`/`typeService`; no BE re-fetch or persistence of quotes.
- `quoteId` remains the opaque identifier the provider expects; the new snapshot fields are DB-only and never sent to the provider API.
- No migration script is needed for existing guide docs — `quoteData.quote` will simply be absent on old docs and surfaced as `null`/omitted in responses.
- The change is single-feature (guides module only); it does not touch quotes, providers, or global-configs modules.
- `source` from `GetQuoteData` is intentionally excluded from the snapshot because it duplicates `Guide.provider`.

---

## High-Level Actions

1. Add a `QuoteSnapshot` nested `@Schema({ _id: false })` class on `guide.entity.ts` and a `quote` prop on `QuoteData` (additive; do not remove existing loose `service`/`courier`/`total`).
2. Add `QuoteSnapshotDto` (request) and `QuoteSnapshotResponseDto` (response) classes; nest on `CreateGuideDto`, `UpdateGuideDto`, and `GuideDataDto`.
3. In `createGuide`, write `quoteData: { quoteId: payload.quoteId, quote: payload.quote }` instead of the current `{ quoteId: payload.quoteId }`.
4. In `updateGuideData`, extend the `setFields` dot-notation block to write `quoteData.quote.*` when the snapshot fields are present.
5. In `formatGuideResponse`, surface `guide.quoteData?.quote` (nullable) in the `FormattedGuideData` payload.
6. Update `RetryPayload` and `retryFailedGuide` so the retry `$set` never wholesale-replaces `quoteData`; confirm the snapshot survives.
7. Update unit tests for `createGuide`, `updateGuideData`, `formatGuideResponse`, and controller DTO validation.
8. No new `KraftError` codes, no new module imports, no env vars, no DB migration.

---

## Verification

- `pnpm build` must pass before bundling.
- `pnpm test` — expected: 2 known-failing suites unchanged (`mail.service.spec.ts`, `jwt-guard.guard.spec.ts` per AGENTS.md); new/modified guide tests must pass.
- `pnpm lint` — not a green gate (~117 errors pre-existing); only fix new type-safety issues introduced by this change.
- Manual: `POST /guides/db/create` with `quote: { service, courier, total, typeService }` → `GET /guides/db/:id` returns the saved snapshot.