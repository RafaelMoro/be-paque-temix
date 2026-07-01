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

1. **`POST /guides/db/create`** accepts the complete selected quote object (`GetQuoteData` shape) and persists it on the `Guide` document under `quoteData`.
2. **`GET /guides/db/:guideId`** returns the full stored quote snapshot (all `GetQuoteData` fields).
3. **`GET /guides/db/admin`** accepts a boolean query param (e.g., `includeMarginDetails` or `showQAdj`) that, when `true`, includes the `qAdj*` fields in the response. Default: `false` (backward-compatible — margin fields omitted).
4. **Retry** (`POST /guides/db/:guideId/retry`) preserves the stored quote snapshot; it must not wipe `quoteData` when re-calling the provider.
5. **`PATCH /guides/db/:guideId`** (update guide) accepts and updates the stored quote snapshot when the client sends it.
6. **Non-admin guide listing** (`GET /guides/db`) never exposes `qAdj*` fields regardless of the query param.

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

### 3. Response DTO — conditional qAdj* exposure on admin listing

**File:** `src/guides/dtos/guides-db-responses.dto.ts`

Create two response sub-DTOs:
- `QuoteSnapshotResponseDto` — all quote fields INCLUDING `qAdj*`
- `QuoteSnapshotPublicResponseDto` — only `id`, `service`, `total`, `typeService`, `courier`, `source` (NO `qAdj*`)

`GuideDataDto` uses `QuoteSnapshotPublicResponseDto` by default (for non-admin listings and single-guide GET). Admin listing (via `PaginatedGuidesResponseDto`) decides at runtime which sub-DTO to use based on the query param.

Alternatively (simpler): always include all fields in the DTO but strip `qAdj*` in `formatGuideResponse` when `includeMarginDetails !== true`. This avoids a second DTO class and keeps the response type consistent.

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

### 7. formatGuideResponse — conditional qAdj* stripping

```typescript
formatGuideResponse(guide: GuideDoc, includeMarginDetails = false): GuideResponseDto {
  const quote = guide.quoteData?.quote;
  const quoteData = includeMarginDetails ? quote : this.stripQAdjFields(quote);
  // ...
}

private stripQAdjFields(quote: QuoteSnapshot): QuoteSnapshotPublic {
  // return copy without qAdjMode, qBaseRef, qAdjFactor, qAdjBasis, qAdjSrcRef
}
```

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
2. **Response shape consistency:** Always return `quote` in `GuideDataDto` (with `qAdj*` null/omitted when not admin), vs having two separate response DTOs. Recommendation: always return `quote` with all fields; `qAdj*` are `null` when not admin — avoids type bifurcation.
3. **Backward compatibility on admin listing:** Default `includeMarginDetails = false` means existing admin clients see no change. Confirm this is acceptable vs default `= true` which would expose margin data immediately.
4. **`id` field naming:** `GetQuoteData.id` is what the FE sends, but the entity already stores it as `quoteId` (`QuoteData.quoteId`). The `QuoteSnapshot.id` maps to the same `quoteId` but the FE also sends `quoteId` separately. Should `id` in the snapshot be stored separately from `quoteId` (two copies of the same value), or should we suppress `id` in the snapshot since `quoteId` is already stored? **Recommendation: store `id` in the snapshot as-is; `quoteId` is the canonical identifier used by the provider API.**
5. **`source` field:** `GetQuoteData.source` duplicates `Guide.provider`. Should the snapshot store `source` or just rely on `Guide.provider`? **Recommendation: store `source` in snapshot for completeness; it records what the quote said at creation time even if provider changes later.**

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
