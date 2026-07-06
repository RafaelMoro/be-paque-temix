# Plan — Save Full Quote Snapshot on Guide Creation

**Story:** Persist full quote snapshot on guide creation; expose `qAdj*` margin fields on admin listing via opt-in query param.
**Research doc:** [`ai-research/save-quote-on-guide-creation-research.md`](../ai-research/save-quote-on-guide-creation-research.md)
**Status:** Awaiting sign-off

---

## Scope discipline — what's in, what's out

### In scope (traces to AC)
- Replace dead `QuoteData` entity fields with a `QuoteSnapshot` nested schema (AC 1).
- `CreateGuideDto`: drop `quoteId`, add required `quote: QuoteSnapshotDto` (AC 1, breaking).
- `UpdateGuideDto`: drop `quoteId`, add optional `quote?: QuoteSnapshotDto` (AC 6, breaking).
- Persist `payload.quote` in `createGuide`; `callProviderApi` derives `quoteId` for providers (AC 1, 5).
- `formatGuideResponse`: strip `qAdj*` by default; include only when `includeInternalPricing=true` (AC 2, 3, 4).
- `GetAdminGuidesQueryDto`: add `includeInternalPricing?: boolean` (default `false`) (AC 4).
- Response DTO `GuideDataDto`: replace `quoteId?` with `quote?: QuoteSnapshotResponseDto` (AC 2, 3, 4).
- Retry preserves `quoteData.quote` (AC 5) — no wholesale `quoteData` replacement in retry `$set`.
- `updateGuideData` accepts `dto.quote` and updates `quoteData.quote` (AC 6).

### Out of scope (refused)
- New quote collection / re-fetching quote from provider (research §Out of scope).
- Changing `POST /quotes` response shape (research §Out of scope).
- Frontend implementation (research §Out of scope).
- Lint/format phases — PR concern, not a phase.
- Refactors of nearby guide methods not touched by an AC.
- Migration script — research confirms old `quoteData.quote = undefined` is handled gracefully by `formatGuideResponse` returning `undefined` quote (no crash, no migration).

---

## Decision beyond research (user-confirmed)

**Provider quote-id access — "Transform in `callProviderApi`".**
The research doc claimed only `callProviderApi` reads `payload.quoteId`. Tracing found **3 provider services** read `payload.quoteId` directly (`guia-envia.service.ts:432`, `t1.service.ts:335`, `manuable.service.ts:189` via `manuable.utils.ts:98`); Pakke does not use it. Plus `RetryPayload` (`guides.interface.ts:42`) and `updateGuideData`'s merged payload carry `quoteId`.

Chosen approach: `callProviderApi` receives `CreateGuideDto` (no `quoteId`), builds a `ProviderGuidePayload` object with `quoteId: payload.quote?.id`, passes it to `routeToProvider` → provider services. Provider services keep reading `payload.quoteId` unchanged (logic untouched); only their param **type annotation** changes from `CreateGuideDto` to `ProviderGuidePayload`. Verified `createGuideStandardized` is only called from `routeToProvider` (4 calls) — no provider-controller direct callers, so the signature change is contained.

`RetryPayload` is restructured to carry `quote: { id }` instead of `quoteId`, so retry and update paths feed `callProviderApi` a `CreateGuideDto`-shaped object and reuse the same transform.

---

## Phases

### Phase 1 — Schema & DTOs

Independently testable: `pnpm build` compiles; DTO shapes match `GetQuoteData` minus `source`.

#### Changes Required

**`src/guides/entities/guide.entity.ts`** — Modify (lines 37–48)

Replace the dead `QuoteData` class with a `QuoteSnapshot` nested schema + a thin `QuoteData` wrapper holding `quote?: QuoteSnapshot`. No migration — old docs have `quoteData.quote = undefined`, handled by `formatGuideResponse`.

```typescript
@Schema({ _id: false })
class QuoteSnapshot {
  @Prop({ required: true }) id: string | number;        // required — provider API needs it
  @Prop() service?: string;
  @Prop() total?: number;
  @Prop() qBaseRef?: number;
  @Prop() qAdjFactor?: number;
  @Prop() qAdjBasis?: number;
  @Prop() qAdjMode?: 'P' | 'A';
  @Prop() qAdjSrcRef?: 'default' | 'custom';
  @Prop() typeService?: 'standard' | 'nextDay' | null;
  @Prop() courier?: string | null;
  // source intentionally omitted — Guide.provider is authoritative
}

@Schema({ _id: false })
class QuoteData {
  @Prop({ type: QuoteSnapshot }) quote?: QuoteSnapshot;
}
```

- `quote` optional on entity (old docs have none). `id` required on the nested schema so DB-level integrity holds for new docs.
- Existing `Guide.quoteData: QuoteData` prop (line 119) unchanged — only the class body changes.

**`src/guides/dtos/guides-db.dto.ts`** — Modify

1. Add `QuoteSnapshotDto` class mirroring `GetQuoteData` minus `source`. `id` required (`@IsNotEmpty()`); all others `@IsOptional()` with `@IsString()` / `@IsNumber()` / `@IsEnum()` as appropriate. Import `GetQuoteData` field types from `@/quotes/quotes.interface` for `qAdjMode`, `qAdjSrcRef`, `typeService` (reuse, don't redeclare).

2. `CreateGuideDto` (line 224–227): **remove** `quoteId` field. **Add**:
```typescript
@ApiProperty({ type: QuoteSnapshotDto, required: true })
@ValidateNested()
@Type(() => QuoteSnapshotDto)
quote: QuoteSnapshotDto;
```

3. `UpdateGuideDto` (line 251–255): **remove** `quoteId?` field. **Add** optional `quote?: QuoteSnapshotDto` (same decorators + `@IsOptional()`).

4. `GetAdminGuidesQueryDto` (after line 81): add
```typescript
@ApiProperty({ required: false, default: false })
@IsOptional()
@IsBoolean()
@Type(() => Boolean)
includeInternalPricing?: boolean = false;
```

**`src/guides/dtos/guides-db-responses.dto.ts`** — Modify

1. Add `QuoteSnapshotResponseDto` (all fields optional, includes `qAdj*`):
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
```

2. `GuideDataDto` (line 39–40): **remove** `quoteId?: string`. **Add**:
```typescript
@ApiProperty({ type: QuoteSnapshotResponseDto, required: false })
quote?: QuoteSnapshotResponseDto;
```

**`src/guides/guides.interface.ts`** — Modify

1. `RetryPayload` (line 42): replace `quoteId: string` with `quote: { id: string | number }`.
2. Add a `ProviderGuidePayload` type alias derived from the DTO (per "DTOs are source of truth" rule):
```typescript
import { CreateGuideDto } from './dtos/guides-db.dto';
export type ProviderGuidePayload = Omit<CreateGuideDto, 'quote'> & {
  quoteId: string | number;
};
```

#### Edge cases
- `QuoteSnapshot.id` is `string | number` (matches `GetQuoteData.id`). Provider utils that string-coerce it (e.g. GE `servicio_id`) keep working.
- Old docs: `guide.quoteData?.quote` is `undefined` → `formatGuideResponse` returns `quote: undefined`. No crash.

#### Success criteria
- `pnpm build` passes.
- `grep -rn "quoteId" src/guides/dtos src/guides/entities src/guides/guides.interface.ts` returns no top-level DTO/entity `quoteId` (only `ProviderGuidePayload.quoteId` and `RetryPayload.quote`).

---

### Phase 2 — Service wiring & provider signature

Independently testable: `pnpm build` + `pnpm test` (existing specs updated); manual: create a guide, GET single, GET admin with/without flag.

#### Changes Required

**`src/guides/services/guides-db.service.ts`** — Modify

1. **`createGuide`** (line 81): change `quoteData: { quoteId: payload.quoteId }` → `quoteData: { quote: payload.quote }`.

2. **`callProviderApi`** (line 670): keep signature `payload: CreateGuideDto`. Before calling `routeToProvider`, build the provider payload:
```typescript
const providerPayload: ProviderGuidePayload = {
  provider: payload.provider,
  quoteId: payload.quote?.id,
  parcel: payload.parcel,
  origin: payload.origin,
  destination: payload.destination,
  notifyMe: payload.notifyMe,
};
return this.routeToProvider(providerPayload);
```
(Remove the direct `this.routeToProvider(payload)` indirection — `routeToProvider` now takes `ProviderGuidePayload`.)

3. **`routeToProvider`** (line 790): change signature `payload: CreateGuideDto` → `payload: ProviderGuidePayload`. Bodies unchanged.

4. **`retryFailedGuide`** (line 171–178): build `RetryPayload` with `quote: { id: guide.quoteData.quote?.id }` instead of `quoteId: guide.quoteData.quoteId`. The retry `$set` (lines 193–211) already touches only specific fields (`status`, `externalId`, `labelUrl`, `retries.*`) — `quoteData.quote` is preserved. **Do not** add any `quoteData: {...}` wholesale `$set` in retry (research non-obvious constraint). Add a `// ponytail:` comment on the retry `$set` noting this.

5. **`updateGuideData`** (line 352–375): restructure merged payload to use `quote`:
```typescript
const mergedPayload = {
  provider: guide.provider as ProviderSource,
  quote: dto.quote ?? guide.quoteData.quote,
  parcel: dto.parcel ?? guide.parcel,
  origin: dto.origin ?? guide.origin,
  destination: dto.destination ?? guide.destination,
  notifyMe: dto.notifyMe ?? false,
};
```
And the `$set` (line 375): replace `if (dto.quoteId) setFields['quoteData.quoteId'] = dto.quoteId;` with:
```typescript
if (dto.quote) setFields['quoteData.quote'] = dto.quote;
```

6. **`formatGuideResponse`** (line 859): add `includeInternalPricing = false` param. Replace `quoteId: guide.quoteData?.quoteId` (line 867) with:
```typescript
quote: this.buildQuoteResponse(guide.quoteData?.quote, includeInternalPricing),
```
Add private helpers:
```typescript
private buildQuoteResponse(
  quote: GuideDoc['quoteData']['quote'] | undefined,
  includeInternalPricing: boolean,
): QuoteSnapshotResponseDto | undefined {
  if (!quote) return undefined;
  if (includeInternalPricing) return { ...quote };
  return this.stripQAdjFields(quote);
}

private stripQAdjFields(quote: NonNullable<GuideDoc['quoteData']['quote']>) {
  const { qAdjMode, qAdjBasis, qAdjFactor, qAdjSrcRef, qBaseRef, ...rest } = quote;
  return rest;
}
```

7. **Callers of `formatGuideResponse`**:
   - `getGuidesByUser` → via `executePaginatedQuery` (line 598): always strips. `executePaginatedQuery` calls `formatGuideResponse(g)` with default `false`. **No change needed** (non-admin never includes).
   - `getAllGuides` (line 133): pass `filters.includeInternalPricing` through to `executePaginatedQuery`. Add an `includeInternalPricing: boolean` param to `executePaginatedQuery` (default `false`); thread it into the `.map` callback.
   - `getGuideById` (line 144): `formatGuideResponse(guide, false)` — non-admin/single-guide always strips (AC 2: no admin opt-in for this endpoint). Explicit `false`.
   - `createGuide` (line 95), `retryFailedGuide` (line 215), `syncGuideWithProvider` (line 279), `addComment` (line 309), `updateGuideStatus` (line 329), `updateGuideData` (line 404): pass `false` explicitly (these return single-guide responses to non-admin or admin callers; AC 2/3 say `qAdj*` never in non-admin; single-guide admin has no opt-in per research Q5).

**Provider services — signature only (logic unchanged):**

- `src/guia-envia/services/guia-envia.service.ts:428` — `createGuideStandardized(payload: CreateGuideDto)` → `(payload: ProviderGuidePayload)`. Update import.
- `src/t1/services/t1.service.ts:305` — same.
- `src/manuable/services/manuable.service.ts:185` — same.
- `src/pakke/services/pakke.service.ts:221` — same (even though Pakke ignores `quoteId`, signature must match `ProviderGuidePayload` for the `routeToProvider` call).
- `src/manuable/manuable.utils.ts:98` — destructure `quoteId` from payload, unchanged (payload now has `quoteId` from the transform).

**Imports:** `ProviderGuidePayload` imported from `@/guides/guides.interface` in each provider service.

#### Edge cases
- `guide.quoteData.quote?.id` may be `undefined` for old docs on retry — provider call will fail at provider boundary with a clear error, which is correct behavior (can't retry a guide with no stored quote id). No silent fallback.
- `executePaginatedQuery` is shared between admin and non-admin; the `includeInternalPricing` flag defaults to `false` so non-admin path (`getGuidesByUser`) is unaffected.

#### Success criteria
- `pnpm build` passes.
- `pnpm test` — existing specs green after mock updates (see Phase 3).
- Manual: `POST /guides/db/create` with `quote: { id, service, total, ... }` persists full snapshot; `GET /guides/db/:id` returns `quote` without `qAdj*`; `GET /guides/db/admin?includeInternalPricing=true` returns `qAdj*`.

---

### Phase 3 — Tests

#### Changes Required

**`src/guides/services/guides-db.service.spec.ts`** — Modify

- All `createGuide` mock payloads: replace `quoteId: 'quote-123'` with `quote: { id: 'quote-123', service: '...', total: 100, typeService: 'standard', courier: '...' }` (lines ~148, 452, 538, 736, 756, 793, 828, 847).
- `quoteData: { quoteId: 'q1' }` → `quoteData: { quote: { id: 'q1' } }` in guide mocks (lines 452, 538, 736, 793, 828, 847).
- `updateGuideData` cases (lines 756, 814): `dto.quoteId` → `dto.quote: { id: ... }`; `$set` assertion `'quoteData.quoteId'` → `'quoteData.quote'` (line 774).
- `formatGuideResponse` assertions: `quoteId` field → `quote` object; add two new cases — (a) `includeInternalPricing=false` strips `qAdj*`, (b) `includeInternalPricing=true` includes them.
- `getAllGuides` test: add `includeInternalPricing` param coverage (true and false).

**`src/guides/services/guides-db.service.spec.ts` mock setup** (lines 49–62): `createGuideStandardized: jest.fn()` mocks unchanged — they receive `ProviderGuidePayload` now, but jest fn doesn't care.

No new spec files. No provider-service spec changes (their logic is unchanged — `payload.quoteId` still resolves because the transform supplies it). If a provider spec asserts the call argument shape, it still sees `quoteId` (transformed payload has it).

#### Success criteria
- `pnpm test -- guides-db.service.spec` green.
- `pnpm build` passes.

---

## Test coverage

| File | Coverage areas | Pattern reference |
| --- | --- | --- |
| `src/guides/services/guides-db.service.ts` | `createGuide` persists full `quote` snapshot; `callProviderApi` derives `quoteId` from `payload.quote.id`; `updateGuideData` updates `quoteData.quote`; `retryFailedGuide` preserves `quoteData.quote`; `formatGuideResponse` strips `qAdj*` unless `includeInternalPricing=true`; `getAllGuides` threads flag through | Existing `guides-db.service.spec.ts` patterns |
| `src/guides/dtos/guides-db.dto.ts` | `QuoteSnapshotDto` validation (required `id`, optional others); `CreateGuideDto.quote` required; `UpdateGuideDto.quote` optional; `GetAdminGuidesQueryDto.includeInternalPricing` default `false` | DTO validation patterns in same file |
| `src/guides/entities/guide.entity.ts` | `QuoteSnapshot.id` required; `quoteData.quote` optional on entity | Entity schema patterns in same file |

No integration/e2e tests — research scope is unit-level.

---

## Assumptions (beyond research)

- Old guide docs with `quoteData = { quoteId: '...' }` (legacy) will have `quoteData.quote = undefined` after deploy — `formatGuideResponse` returns `quote: undefined`, no crash. Acceptable (research confirms).
- Provider services keep reading `payload.quoteId`; the transform in `callProviderApi` always supplies it from `payload.quote?.id`. If `quote.id` is missing on create, the provider call fails at the provider boundary — correct, since `id` is required by AC 1.
- `executePaginatedQuery` is the single shared paginated path; threading `includeInternalPricing` (default `false`) through it keeps `getGuidesByUser` (non-admin) unaffected without a separate code path.

## Unresolved questions

None — all research open questions resolved; the one gap found during planning (provider-service `quoteId` access) was resolved by the user choosing "Transform in `callProviderApi`".

## Decisions made beyond research

- **Provider payload type**: introduced `ProviderGuidePayload = Omit<CreateGuideDto, 'quote'> & { quoteId: string | number }` in `guides.interface.ts` rather than changing `CreateGuideDto` back to include `quoteId`. Honors research's "`quoteId` removed from DTO" while giving provider services a typed payload.
- **`formatGuideResponse` param**: `includeInternalPricing = false` default; single-guide and create/retry/sync/comment/status/update paths always pass `false` (AC 2: no admin opt-in for single-guide; AC 3: non-admin listing never includes). Only `getAllGuides` threads the flag.
- **Retry `$set` guard**: added a `// ponytail:` comment flagging that retry must not do wholesale `quoteData` replacement (research non-obvious constraint) to preserve `quoteData.quote` across retries (AC 5).
