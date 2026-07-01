# Planning Note — Save Quote on Guide Creation

**Story:** Persist full quote snapshot on guide creation; expose `qAdj*` on admin listing.
**Date:** 2026-06-30

## Non-obvious decision

The research doc claimed only `callProviderApi` reads `payload.quoteId`. Tracing found **3 provider services** read it directly (`guia-envia.service.ts:432`, `t1.service.ts:335`, `manuable.service.ts:189` via `manuable.utils.ts:98`); Pakke ignores it. Plus `RetryPayload` (`guides.interface.ts:42`) and `updateGuideData`'s merged payload.

**Resolution (user-confirmed):** Transform in `callProviderApi` — it builds a `ProviderGuidePayload` (`Omit<CreateGuideDto, 'quote'> & { quoteId }`) and passes it to `routeToProvider` → provider services. Provider services keep reading `payload.quoteId` unchanged (logic untouched); only the param **type annotation** changes from `CreateGuideDto` to `ProviderGuidePayload`.

## Scope containment

`createGuideStandardized` is only called from `routeToProvider` (4 calls in `guides-db.service.ts`) and mocked in the spec — no provider-controller direct callers. So the 4 signature changes are contained to the provider service files + their imports.

## Retry constraint

Retry `$set` only touches specific fields (`status`, `externalId`, `labelUrl`, `retries.*`), never wholesale `quoteData`. Must stay that way for AC 5 (retry preserves `quoteData.quote`). Flagged with a `// ponytail:` comment in the plan.

## formatGuideResponse flag threading

`executePaginatedQuery` is shared between admin (`getAllGuides`) and non-admin (`getGuidesByUser`). Threading `includeInternalPricing` (default `false`) through it keeps non-admin unaffected without a separate code path. Single-guide endpoints and mutating endpoints (create/retry/sync/comment/status/update) always pass `false` — AC 2 has no admin opt-in for single-guide.
