# Save Full Quote Data on Guide Creation — Research

## Overview

This document outlines the high-level actions needed to persist the complete quote snapshot used to generate a guide, and to expose profit-margin fields (`qAdj*`) on the admin guide listing endpoint based on a query parameter.

**Last updated:** 2026-06-30
**Status:** Awaiting sign-off

---

## Story Definition

### Title
Persist full quote snapshot on guide creation and expose `qAdj*` margin fields on admin listing.

### Description
Today `POST /guides/db/create` only persists `quoteId` on the guide document (`guides-db.service.ts:81`). The client receives a full quote object from `POST /quotes` (`GetQuoteData` — 11 fields, `quotes.interface.ts:16-33`) and selects one. After this change, the client sends the complete selected quote object to `POST /guides/db/create`, and the server persists all quote fields on the guide document.

Additionally, the `GET /guides/db/admin` endpoint accepts a query param to control whether the `qAdj*` profit-margin fields (`qAdjMode`, `qAdjBasis`, `qAdjFactor`, `qAdjSrcRef`, `qAdjBaseRef`) are included in the response. These fields are sensitive (they expose internal margin configuration) and should only be shown to admins on demand.

### Acceptance Criteria

1. **`POST /guides/db/create`** accepts the complete selected quote object (`GetQuoteData` shape) and persists it on the `Guide` document under `quoteData.quote`.
2. **`GET /guides/db/:guideId`** returns the stored quote snapshot **without** `qAdj*` fields (non-admin; `qAdj*` never exposed to non-admins).
3. **`GET /guides/db`** (non-admin paginated listing) returns the stored quote snapshot **without** `qAdj*` fields — `qAdj*` are never included regardless of any query param.
4. **`GET /guides/db/admin`** accepts a boolean query param (e.g., `includeMarginDetails`) that, when `true`, includes the `qAdj*` fields (`qAdjMode`, `qAdjBasis`, `qAdjFactor`, `qAdjSrcRef`, `qBaseRef`) in the response. Default: `false` (backward-compatible — margin fields omitted even to admins by default).
5. **Retry** (`POST /guides/db/:guideId/retry`) preserves the stored quote snapshot; it must not wipe `quoteData.quote` when re-calling the provider.
6. **`PATCH /guides/db/:guideId`** (update guide) accepts and updates the stored quote snapshot when the client sends it.

### Out of scope
- Persisting quotes in MongoDB or any new collection.
- Re-fetching the quote from the provider by `quoteId`.
- Changing the `POST /quotes` response shape.
- Frontend implementation.

---

## Current State

### Quote data flow
```
POST /quotes → returns GetQuoteData[] (11 fields, quotes.interface.ts:16-33)
     ↓
FE selects one quote, sends to POST /guides/db/create
     ↓
createGuide: quoteData = { quoteId: payload.quoteId }  ← ONLY quoteId saved today
```

### GetQuoteData shape (what FE sends)
```typescript
// quotes.interface.ts:16-33
interface GetQuoteData {
  id: string | number;           // becomes quoteId on the guide
  service: string;
  total: number;
  qBaseRef?: number;             // qAdj* margin breakdown
  qAdjFactor?: number;
  qAdjBasis?: number;
  qAdjMode?: 'P' | 'A';         // percentage or absolute
  qAdjSrcRef?: 'default' | 'custom';
  typeService: 'standard' | 'nextDay' | null;
  courier: QuoteCourier | null;
  source: ProviderSource;         // 'GE' | 'TONE' | 'Pkk' | 'Mn'
}
```

### Existing QuoteData on Guide entity (dead — never populated)
```typescript
// guide.entity.ts:37-48
class QuoteData {
  @Prop({ required: true }) quoteId: string;
  @Prop() qAdjMode?: string;
  @Prop() qBaseRef?: number;
  @Prop() qAdjFactor?: number;
  @Prop() qAdjBasis?: number;
  @Prop() qAdjSrcRef?: string;
  @Prop() total?: number;        // ← duplicate of GetQuoteData.total
  @Prop() service?: string;      // ← duplicate of GetQuoteData.service
  @Prop() courier?: string;      // ← duplicate of GetQuoteData.courier
  // NOTE: typeService is MISSING from entity entirely
}
```

`createGuide` only writes `{ quoteId: payload.quoteId }` — none of the above are populated.

---

## High-Level Actions

### 1. Entity — replace dead QuoteData with full quote snapshot

**File:** `src/guides/entities/guide.entity.ts`

Add a new `QuoteSnapshot` `@Schema({ _id: false })` class capturing all `GetQuoteData` fields. Replace the existing dead `QuoteData` class's fields with a single `quote` prop of type `QuoteSnapshot`. Keep only `quoteId` as a top-level required field on `QuoteData` alongside the new `quote` prop.

```typescript
@Schema({ _id: false })
class QuoteSnapshot {
  @Prop() id?: string | number;
  @Prop() service?: string;
  @Prop() total?: number;
  @Prop() qBaseRef?: number;
  @Prop() qAdjFactor?: number;
  @Prop() qAdjBasis?: number;
  @Prop() qAdjMode?: 'P' | 'A';
  @Prop() qAdjSrcRef?: 'default' | 'custom';
  @Prop() typeService?: 'standard' | 'nextDay' | null;
  @Prop() courier?: string | null;
  @Prop() source?: string;
}

@Schema({ _id: false })
class QuoteData {
  @Prop({ required: true }) quoteId: string;
  @Prop({ type: QuoteSnapshot }) quote?: QuoteSnapshot;
}
```

> **Note on migration:** The existing `QuoteData` fields (`qAdjMode`, `qBaseRef`, etc.) are dead — no code populates them. This change replaces their use. No data migration needed since nothing writes to them. Old documents will have `quoteData.quote` as `undefined`.

### 2. Request DTO — QuoteSnapshotDto

**File:** `src/guides/dtos/guides-db.dto.ts`

Add `QuoteSnapshotDto` mirroring `GetQuoteData` (all fields optional). Nest it on `CreateGuideDto` as `quote: QuoteSnapshotDto` (required on create). On `UpdateGuideDto` it should be optional.

```typescript
export class QuoteSnapshotDto {
  @IsString()
  @IsOptional()
  id?: string | number;

  @IsString()
  @IsOptional()
  service?: string;

  @IsNumber()
  @IsOptional()
  total?: number;

  // ... all GetQuoteData fields, all @IsOptional()
}

export class CreateGuideDto {
  // ... existing fields ...
  @ApiProperty({ type: QuoteSnapshotDto, required: true })
  @ValidateNested()
  @Type(() => QuoteSnapshotDto)
  quote: QuoteSnapshotDto;
}

export class UpdateGuideDto {
  // ... existing fields ...
  @ApiProperty({ type: QuoteSnapshotDto, required: false })
  @ValidateNested()
  @Type(() => QuoteSnapshotDto)
  @IsOptional()
  quote?: QuoteSnapshotDto;
}
```

### 3. Response DTO — qAdj* never on non-admin, opt-in on admin

**File:** `src/guides/dtos/guides-db-responses.dto.ts`

Use a single `QuoteSnapshotResponseDto` that includes all `GetQuoteData` fields. Strip `qAdj*` at the service layer:

- **`formatGuideResponse` for non-admin calls** (`getGuideById`, `getGuidesByUser`): always strip `qAdj*` fields, return only `id`, `service`, `total`, `typeService`, `courier`, `source`.
- **`formatGuideResponse` for admin calls** (`getAllGuides`): strip `qAdj*` unless `includeMarginDetails === true`.

This avoids two response DTOs — the wire format is the same, the service layer controls the content.

### 4. Admin listing query param

**File:** `src/guides/dtos/guides-db.dto.ts`

Add `includeMarginDetails?: boolean` to `GetAdminGuidesQueryDto` (default `false`).

**File:** `src/guides/services/guides-db.service.ts`

Pass `includeMarginDetails` to `formatGuideResponse` (or a variant). When `false`, strip `qAdj*` fields from the `quote` in the response. When `true`, return all fields. Non-admin `getGuidesByUser` always strips `qAdj*`.

### 5. createGuide — persist full quote

**File:** `src/guides/services/guides-db.service.ts`

```typescript
// createGuide, line ~81
quoteData: {
  quoteId: payload.quoteId,
  quote: payload.quote,  // full QuoteSnapshotDto
},
```

### 6. updateGuideData — update quote snapshot

When `dto.quote` is present, update `quoteData.quote.*` via dot notation alongside `quoteData.quoteId`.

### 7. formatGuideResponse — qAdj* stripped unless admin + includeMarginDetails

```typescript
// New private method on the service
private stripQAdjFields(quote: QuoteSnapshot | undefined): Partial<QuoteSnapshot> | undefined {
  if (!quote) return undefined;
  const { qAdjMode, qAdjBasis, qAdjFactor, qAdjSrcRef, qBaseRef, ...publicQuote } = quote;
  return publicQuote;
}

// formatGuideResponse takes an optional includeMarginDetails param
formatGuideResponse(guide: GuideDoc, includeMarginDetails = false): GuideResponseDto {
  const rawQuote = guide.quoteData?.quote;
  // Non-admin or includeMarginDetails=false → strip qAdj*; admin + includeMarginDetails=true → return all
  const quote = (includeMarginDetails && req.user?.role?.includes('admin')) ? rawQuote : this.stripQAdjFields(rawQuote);
  // ...
}
```

`getGuidesByUser` and `getGuideById` call `formatGuideResponse(guide, false)` (admin check implicit — they never have admin access).
`getAllGuides` calls `formatGuideResponse(guide, includeMarginDetails)` — the boolean comes from the query param.

### 8. Update tests

- `guides-db.service.spec.ts` — update `createGuide` mock to include `quote` field; update assertions for `formatGuideResponse` with/without `includeMarginDetails`.
- `guides-db.controller.spec.ts` (if present) — add `includeMarginDetails` param to admin listing tests.

---

## Affected Files

| File | Change |
| --- | --- |
| `src/guides/entities/guide.entity.ts` | Replace dead `QuoteData` fields with `QuoteSnapshot` nested schema + `quote` prop |
| `src/guides/dtos/guides-db.dto.ts` | Add `QuoteSnapshotDto`, nest on `CreateGuideDto` (required) and `UpdateGuideDto` (optional); add `includeMarginDetails` to `GetAdminGuidesQueryDto` |
| `src/guides/dtos/guides-db-responses.dto.ts` | Update `GuideDataDto` with `quote` field; optionally create a public-only sub-DTO |
| `src/guides/services/guides-db.service.ts` | Persist `payload.quote` in `createGuide`; strip `qAdj*` in `formatGuideResponse` unless `includeMarginDetails`; update `updateGuideData` for quote field |
| `src/guides/guides.interface.ts` | `RetryPayload` does not need changes; `FormattedGuideData` auto-derives from DTO |
| Tests: `src/guides/services/guides-db.service.spec.ts` | Update mocks and assertions |

---

## Open Questions

1. **Query param name:** `includeMarginDetails` vs `showQAdj` vs `exposeInternalPricing`? The param controls whether `qAdj*` fields are returned. `includeMarginDetails` is descriptive but verbose — `showQAdj` is shorter. Choose one.
2. **Backward compatibility on admin listing:** Default `includeMarginDetails = false` means margin data is hidden by default even from admins. Confirm this is acceptable — it means an existing admin client won't see margin data unless it explicitly sends `?includeMarginDetails=true`. Alternative: default `= true` immediately exposes margin data to all admins.
3. **`id` field naming:** `GetQuoteData.id` maps to `QuoteData.quoteId`. The FE also sends `quoteId` as a separate field on `CreateGuideDto`. Should `QuoteSnapshot.id` be stored at all (it duplicates `quoteId`), or should we suppress it? **Recommendation: store `id` in the snapshot for completeness; it records the original quote identifier even if `quoteId` gets updated later.**
4. **`source` field:** `GetQuoteData.source` duplicates `Guide.provider`. Store both? **Recommendation: yes, store `source` in snapshot for audit trail — records what the quote source said at creation time.**
5. **`GET /guides/db/:guideId` — does it need an admin mode too?** Currently there's no `?includeMarginDetails` on the single-guide endpoint. Should admins be able to get `qAdj*` on a specific guide via this endpoint? Or is the admin margin data only accessible via the paginated admin listing?

---

## Assumptions

- FE sends the complete `GetQuoteData` object. The BE validates the shape but trusts the FE values (no re-fetch or cross-check against provider).
- The `qAdj*` margin fields are sensitive internal configuration. Exposing them only to admins via an explicit query param is acceptable.
- Default `includeMarginDetails = false` is backward-compatible and safe by default.
- `quoteId` (entity) and `id` (snapshot) refer to the same underlying value; both are stored without deduping.
- No DB migration needed — old guide documents have `quoteData.quote = undefined`, which is handled gracefully in `formatGuideResponse`.
- Retry does not overwrite `quoteData` — existing `$set` operations only touch specific fields, not the whole `quoteData` object.

---

## Non-Obvious Constraints Found

- The existing `QuoteData` entity fields (`qAdjMode`, `qBaseRef`, `qAdjFactor`, `qAdjBasis`, `qAdjSrcRef`, `service`, `courier`, `total`) are **dead** — `createGuide` never populates them. The new `QuoteSnapshot` schema replaces their logical slot. This is a schema replacement with zero migration risk.
- `typeService` is the only `GetQuoteData` field **missing entirely** from the existing entity — all others existed (unused). Must be added.
- `RetryPayload` (`guides.interface.ts:40-92`) does not carry quote fields; retry reads from stored doc. `quoteData.quote` survives retry as long as no future refactor does a wholesale `quoteData` replacement.
- `source` in `GetQuoteData` matches `Guide.provider` — storing both is intentional (audit trail of what the quote said at creation vs what provider was used).
