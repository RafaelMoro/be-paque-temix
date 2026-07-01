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

1. **`POST /guides/db/create`** accepts the complete selected quote object (`GetQuoteData` shape) and persists it on the `Guide` document under `quoteData.quote`. No separate `quoteId` field on the entity — `id` from `GetQuoteData` is the quote identifier stored in the snapshot.
2. **`GET /guides/db/:guideId`** returns the stored quote snapshot **without** `qAdj*` fields (non-admin; `qAdj*` never exposed to non-admins). No admin opt-in for this endpoint.
3. **`GET /guides/db`** (non-admin paginated listing) returns the stored quote snapshot **without** `qAdj*` fields — `qAdj*` are never included regardless of any query param.
4. **`GET /guides/db/admin`** accepts `includeInternalPricing?: boolean` (default `false`). When `true`, includes `qAdjMode`, `qAdjBasis`, `qAdjFactor`, `qAdjSrcRef`, `qBaseRef` in the response. When `false` (default), margin fields are omitted even to admins.
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

### 1. Entity — QuoteData becomes QuoteSnapshot (source, quoteId removed)

**File:** `src/guides/entities/guide.entity.ts`

Remove the existing dead `QuoteData` class fields (`quoteId`, `qAdjMode`, `qBaseRef`, `qAdjFactor`, `qAdjBasis`, `qAdjSrcRef`, `total`, `service`, `courier`). Replace with a single `QuoteSnapshot` nested schema containing the full `GetQuoteData` minus `source` (which lives on `Guide.provider`).

```typescript
@Schema({ _id: false })
class QuoteSnapshot {
  @Prop() id?: string | number;           // the quote identifier; used by provider API
  @Prop() service?: string;
  @Prop() total?: number;
  @Prop() qBaseRef?: number;
  @Prop() qAdjFactor?: number;
  @Prop() qAdjBasis?: number;
  @Prop() qAdjMode?: 'P' | 'A';
  @Prop() qAdjSrcRef?: 'default' | 'custom';
  @Prop() typeService?: 'standard' | 'nextDay' | null;
  @Prop() courier?: string | null;
  // source intentionally omitted — Guide.provider is the authoritative source
}

// QuoteData becomes just the wrapper
@Schema({ _id: false })
class QuoteData {
  @Prop({ type: QuoteSnapshot }) quote?: QuoteSnapshot;
}
```

> **Note:** The dead fields (including `quoteId`) are removed. The `id` in `QuoteSnapshot` is the quote identifier. No migration needed since nothing writes to the old fields and the old `quoteId` prop is removed entirely.

### 2. Request DTO — QuoteSnapshotDto

**File:** `src/guides/dtos/guides-db.dto.ts`

Add `QuoteSnapshotDto` mirroring `GetQuoteData` minus `source` (all fields optional except `id` which should be required for create). Nest it on `CreateGuideDto` as `quote: QuoteSnapshotDto` (required on create). On `UpdateGuideDto` it should be optional.

Also add `includeInternalPricing?: boolean` to `GetAdminGuidesQueryDto` (default `false`).

```typescript
export class QuoteSnapshotDto {
  @ApiProperty({ description: 'Quote identifier used by the provider API' })
  @IsNotEmpty()
  id?: string | number;

  @IsString()
  @IsOptional()
  service?: string;

  @IsNumber()
  @IsOptional()
  total?: number;

  // ... remaining GetQuoteData fields, all @IsOptional()
}

export class CreateGuideDto {
  // ... provider, parcel, origin, destination, notifyMe remain ...
  // Remove quoteId — it is now inside the quote snapshot
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

// On GetAdminGuidesQueryDto, add:
@ApiProperty({ required: false, default: false })
@IsBoolean()
@IsOptional()
includeInternalPricing?: boolean = false;
```

> **Breaking change:** `CreateGuideDto` currently has `quoteId: string` as a required field (`guides-db.dto.ts:227`). This is removed and replaced by the nested `quote` object. The provider API call (`callProviderApi`) uses `payload.quote.id` instead of `payload.quoteId`. This is a breaking API change for the client — `quoteId` is no longer a top-level string but `quote.id` inside the object.

### 3. Response DTO — single QuoteSnapshotResponseDto, qAdj* stripped at service layer

**File:** `src/guides/dtos/guides-db-responses.dto.ts`

Add `QuoteSnapshotResponseDto` to `GuideDataDto`. All quote fields included in the type (including `qAdj*`). Stripping happens in the service layer, not at the DTO level — single response shape, variable content.

```typescript
export class QuoteSnapshotResponseDto {
  @ApiProperty() id?: string | number;
  @ApiProperty() service?: string;
  @ApiProperty() total?: number;
  @ApiProperty() qBaseRef?: number;
  @ApiProperty() qAdjFactor?: number;
  @ApiProperty() qAdjBasis?: number;
  @ApiProperty() qAdjMode?: string;
  @ApiProperty() qAdjSrcRef?: string;
  @ApiProperty() typeService?: string | null;
  @ApiProperty() courier?: string | null;
}

// GuideDataDto gets:
@ApiProperty({ type: QuoteSnapshotResponseDto, required: false })
quote?: QuoteSnapshotResponseDto;
```

### 4. Admin listing query param

**File:** `src/guides/dtos/guides-db.dto.ts`

Add `includeInternalPricing?: boolean` to `GetAdminGuidesQueryDto` (default `false`).

**File:** `src/guides/services/guides-db.service.ts`

Pass `includeInternalPricing` to `formatGuideResponse`. When `false`, strip `qAdj*` fields. When `true`, return all fields. Non-admin `getGuidesByUser` always strips `qAdj*`.

### 5. createGuide — persist full quote; callProviderApi uses quote.id

**File:** `src/guides/services/guides-db.service.ts`

```typescript
// createGuide, line ~81
quoteData: {
  quote: payload.quote,  // full QuoteSnapshotDto
},
```

`callProviderApi` accesses `payload.quoteId` — change this to `payload.quote?.id` (breaking: `CreateGuideDto` no longer has top-level `quoteId`).

### 6. updateGuideData — update quote snapshot

When `dto.quote` is present, update `quoteData.quote.*` via dot notation.

### 7. formatGuideResponse — qAdj* stripped at service layer, not DTO level

**File:** `src/guides/services/guides-db.service.ts`

```typescript
// Private helper — strips margin fields
private stripQAdjFields(quote: QuoteSnapshot | undefined): Partial<QuoteSnapshot> | undefined {
  if (!quote) return undefined;
  const { qAdjMode, qAdjBasis, qAdjFactor, qAdjSrcRef, qBaseRef, ...publicQuote } = quote;
  return publicQuote;
}

// formatGuideResponse signature unchanged — always receives the full guide doc
// Internally decides what to return based on context:
formatGuideResponse(guide: GuideDoc, includeInternalPricing = false): GuideResponseDto {
  const rawQuote = guide.quoteData?.quote;
  // Strip unless includeInternalPricing=true (admin listing with opt-in)
  const quote = includeInternalPricing ? rawQuote : this.stripQAdjFields(rawQuote);
  // ... build data object with quote ...
}
```

- `getGuidesByUser`: calls `formatGuideResponse(guide, false)` — always strips qAdj*.
- `getGuideById`: calls `formatGuideResponse(guide, false)` — always strips qAdj*.
- `getAllGuides`: calls `formatGuideResponse(guide, includeInternalPricing)` — strips unless opt-in.

### 8. Update tests

- `guides-db.service.spec.ts` — update `createGuide` mock to use `quote: { id, service, ... }` instead of `quoteId`; update `formatGuideResponse` assertions with/without `includeInternalPricing`.
- `guides-db.controller.spec.ts` (if present) — add `includeInternalPricing` param to admin listing tests.

---

## Affected Files

| File | Change |
| --- | --- |
| `src/guides/entities/guide.entity.ts` | Replace dead `QuoteData` fields with `QuoteSnapshot` nested schema; `QuoteData` becomes `{ quote?: QuoteSnapshot }` |
| `src/guides/dtos/guides-db.dto.ts` | Add `QuoteSnapshotDto`; replace `quoteId` on `CreateGuideDto` with nested `quote: QuoteSnapshotDto`; add `includeInternalPricing` to `GetAdminGuidesQueryDto` |
| `src/guides/dtos/guides-db-responses.dto.ts` | Add `QuoteSnapshotResponseDto` to `GuideDataDto` |
| `src/guides/services/guides-db.service.ts` | Persist `payload.quote` in `createGuide`; `callProviderApi` uses `payload.quote?.id` instead of `payload.quoteId`; strip `qAdj*` in `formatGuideResponse` unless `includeInternalPricing`; update `updateGuideData` for quote field |
| `src/guides/guides.interface.ts` | `RetryPayload` does not need changes; `FormattedGuideData` auto-derives from DTO |
| Tests: `src/guides/services/guides-db.service.spec.ts` | Update mocks to use `quote.id`; update `formatGuideResponse` assertions |

---

## Open Questions

All 5 questions resolved:
1. **Query param name:** `includeInternalPricing` ✓
2. **Backward compat on admin listing:** default `false` — hide margin data by default even for admins ✓
3. **`quoteId` removal:** `QuoteData` becomes `{ quote?: QuoteSnapshot }` — no separate `quoteId` field; `QuoteSnapshot.id` is the quote identifier used by the provider API ✓
4. **`source` removal:** not stored in snapshot; `Guide.provider` is authoritative ✓
5. **Single-guide admin mode:** not needed ✓

---

## Assumptions

- FE sends the complete `GetQuoteData` object minus `source`. The BE validates the shape but trusts the FE values (no re-fetch or cross-check against provider).
- The `qAdj*` margin fields are sensitive internal configuration. Exposing them only to admins via `includeInternalPricing=true` is acceptable.
- Default `includeInternalPricing = false` is backward-compatible and safe by default.
- No DB migration needed — old guide documents have `quoteData.quote = undefined`, handled gracefully in `formatGuideResponse`.
- Retry does not overwrite `quoteData` — existing `$set` operations only touch specific fields, not the whole `quoteData` object.
- `Guide.provider` is authoritative for the provider name; `source` from `GetQuoteData` is not stored in the snapshot.
- `QuoteSnapshot.id` is the quote identifier used by the provider API. No separate `quoteId` field on the entity.
- **Breaking API change:** `CreateGuideDto` no longer has `quoteId: string` as a top-level field; `quote.id` is used instead. Client must be updated.

---

## Non-Obvious Constraints Found

- The existing `QuoteData` entity fields (`qAdjMode`, `qBaseRef`, `qAdjFactor`, `qAdjBasis`, `qAdjSrcRef`, `service`, `courier`, `total`, `quoteId`) are **dead** — `createGuide` only ever writes `{ quoteId: payload.quoteId }`. The new `QuoteSnapshot` schema replaces their slot. Zero migration risk since nothing writes to them.
- `typeService` is the only `GetQuoteData` field **missing entirely** from the existing entity. Must be added to `QuoteSnapshot`.
- `RetryPayload` (`guides.interface.ts:40-92`) does not carry quote fields; retry reads from stored doc. `quoteData.quote` survives retry **only if** future refactors avoid wholesale `quoteData` replacement — guard against `$set: { quoteData: {...} }`.
- **Breaking API change:** `CreateGuideDto` drops `quoteId: string` (top-level). Client must send `quote.id` instead. `callProviderApi` already accesses `payload.quoteId` — this reference must change to `payload.quote?.id`.
- `source` intentionally not stored — `Guide.provider` is the authoritative provider identifier.
