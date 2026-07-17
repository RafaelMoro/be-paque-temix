# Plan - Guides DB Conditional PATCH

**Research:** [`ai-research/guides-db-conditional-patch-research.md`](../ai-research/guides-db-conditional-patch-research.md)  
**Status:** Phase 1 complete; awaiting Phase 2 sign-off

## Scope

In scope: condition the existing Guides DB PATCH contract on stored-versus-submitted quote ID, preserve owner access while allowing admins to edit any non-deleted guide, normalize quote-expiration detection, and retain the existing response/error behavior (AC 1-5).

Out of scope: new endpoints or collections, quote API revalidation, provider request refactors, concurrency controls, unrelated Guides DB mutations, and frontend work. No module, entity, response DTO, or repository-context changes are needed.

## Phase 1 - Conditional Update Contract And Access

Implement and unit-test the request contract, same-quote restrictions, changed-quote behavior, and owner/admin lookup.

### Changes

**`src/guides/dtos/guides-db.dto.ts` - Modify near `ParcelDto` (around lines 192-236) and `UpdateGuideDto` (around lines 324-353).**

- Add `UpdateParcelDto`, exposing the existing parcel fields as optional with the same Swagger and class-validator types as `ParcelDto`.
- Use it only for `UpdateGuideDto.parcel`; leave `CreateGuideDto` and `ParcelDto` unchanged.
- This permits `content` and `satProductId` to be represented independently. Runtime rules that depend on the stored quote remain in the service.

**`src/guides/guides-db.constants.ts` - Modify beside the existing Guides DB business/update constants and messages.**

- Add `GDE_BUS_008` for an update that violates the quote-dependent PATCH contract.
- Add `MSG_INVALID_SAME_QUOTE_UPDATE` (`Only parcel content and satProductId can be changed when reusing the stored quote`) and `MSG_INCOMPLETE_CHANGED_QUOTE_PARCEL` (`Parcel content, satProductId, and measurements are required when changing the quote`).
- Continue using `GDE-BDN-013` / `MSG_EMPTY_UPDATE_PAYLOAD` for both `{}` and same-quote requests with no actual `content` or `satProductId` change.

**`src/guides/services/guides-db.service.ts` - Modify `updateGuideData` (around lines 342-427).**

- Keep the three-argument signature `updateGuideData(guideId: string, user: { email?: string; role?: string[] } | undefined, dto: UpdateGuideDto): Promise<GuideResponseDto>`; do not add a parameter or controller guard.
- Resolve the requester as today, derive `isAdmin` from the signed role claim, and pass it to `findAccessibleGuide`. Owners remain filtered by `userId`; admins omit the owner filter; `findAccessibleGuide` continues excluding soft-deleted documents and returning `GDE-NF-001` for missing/cross-owner records.
- Compute quote equality with `String(dto.quote?.id ?? guide.quoteData.quote.id) === String(guide.quoteData.quote.id)` so numeric and string IDs compare consistently.
- On the same-quote path, reject `origin`, `destination`, `notifyMe`, quote properties other than the unchanged `id`, and parcel properties other than `content`/`satProductId` before calling a provider.
- Treat only actual differences in `content` and/or `satProductId` as meaningful. Reject quote-ID-only requests and unchanged values as no-op updates before the provider call.
- Merge allowed same-quote parcel fields over the stored parcel for the provider payload. Persist them through nested parcel paths so omitted measurements and other parcel values are not erased.
- On the changed-quote path, preserve the current contract: `quote`, `origin`, `destination`, and `notifyMe` remain accepted; when `parcel` is supplied, require the same complete core parcel fields currently required by `ParcelDto`, then retain the existing complete-subdocument replacement behavior.
- Keep provider reissue, old external-ID tracking, successful response formatting, generic provider-failure persistence, and the outer `KraftError` catch unchanged.

**`src/guides/services/guides-db.service.spec.ts` - Modify the `updateGuideData` describe block (around lines 789-939).**

Coverage areas:

- Omitted quote and explicitly equal quote IDs both select the same-quote path.
- Numeric and string forms of one quote ID are equal.
- `content` and `satProductId` each work independently and preserve all omitted parcel data in the provider payload and database update.
- Same-quote address, notification, quote-metadata, and parcel measurement fields are rejected before provider/database calls.
- Empty payloads and same-quote no-op values use the empty/no-op Kraft error.
- A changed quote continues accepting every existing update section and requires a complete parcel when one is supplied.
- A regular owner succeeds, a regular cross-owner request receives `GDE-NF-001`, an admin can update another user's non-deleted guide, and an admin cannot update a soft-deleted guide.
- Provider success, generic provider failure, and unexpected async failure retain the existing response envelope or structured Kraft error.

### Success Criteria

- `pnpm test -- guides/services/guides-db.service.spec.ts --runInBand`
- `pnpm build`
- Manual API check with owner, non-owner, and admin JWTs: PATCH one non-deleted guide using content-only, forbidden same-quote fields, a changed quote/full parcel, and a soft-deleted guide; confirm cross-owner and missing-guide responses have the same `GDE-NF-001` envelope and successful responses retain `GuideResponseDto`.

## Phase 2 - Quote Expiration Normalization

Make provider quote-expiration classification reliable for both Axios errors and Nest-wrapped provider errors, then verify PATCH behavior on both quote paths.

### Changes

**`src/guides/services/guides-db.service.ts` - Modify provider error normalization around `buildProviderErrorResult`, `mapProviderErrorToKraftCode`, and `isQuoteExpiredError` (around lines 744-904).**

- Pass the already-extracted normalized provider response body into error-code classification instead of requiring `isQuoteExpiredError` to find Axios-only `response.data` fields again.
- Extend `mapProviderErrorToKraftCode` and `isQuoteExpiredError` with an optional `responseData: Record<string, unknown> | null` argument; keep their existing return types and provider argument behavior.
- For Manuable, inspect the normalized `errors.reason` alongside the existing message locations for `Rate request already has a label`.
- Preserve all other provider error precedence and codes.
- Keep `updateGuideData`'s existing rule that any provider result classified as `GDE-PVR-006` throws `KraftError(GDE-PVR-006, MSG_QUOTE_EXPIRED)` before database persistence. This applies to unchanged and newly submitted quote IDs per the accepted research decision.

**`src/guides/services/guides-db.service.spec.ts` - Modify provider-error and `updateGuideData` coverage near the existing expiration test (around lines 862-895).**

Coverage areas:

- Manuable expiration represented as an Axios-like response maps to `GDE-PVR-006`.
- The same expiration represented by a real Nest `BadRequestException` object maps to `GDE-PVR-006` rather than the generic provider code.
- PATCH with an omitted/equal quote and PATCH with a newly submitted quote both return the exact `MSG_QUOTE_EXPIRED` Kraft error and perform no database update.
- Non-expiration provider errors retain their current classification and failed-guide persistence behavior.

### Success Criteria

- `pnpm test -- guides/services/guides-db.service.spec.ts --runInBand`
- `pnpm build`
- Manual API check against a Manuable response containing `Rate request already has a label`: confirm the response envelope contains `error.code = GDE-PVR-006`, the exact `MSG_QUOTE_EXPIRED` text, and no guide mutation.

## Assumptions

- The signed JWT role array remains authoritative for admin status.
- Presence of any non-allowed field on a same-quote request is rejected, even if its supplied value equals the stored value; clients should send only fields they intend to edit.
- Changed-quote parcel updates retain the existing all-core-fields requirement and complete parcel replacement semantics.
- `value` and `quantity` are not allowed on the same-quote path because AC 1 permits only `content` and `satProductId`.
- Existing provider reissue behavior remains intentional, including a provider call for every meaningful accepted update.

## Decisions Beyond Research

- Derive admin status inside `updateGuideData` from the already-passed request user. This keeps the controller unchanged and follows the thin-controller convention.
- Use a dedicated business-validation Kraft code for quote-dependent contract violations; reserve the existing empty-update code for empty/no-op requests.
- Preserve the changed-quote parcel completeness requirement in service validation because the update-only parcel DTO must make fields optional to represent same-quote content/SAT edits.

## Unresolved Questions

None before implementation.

## Implementation Checklist

- [x] Phase 1 code and focused unit tests
- [x] Phase 1 automated criteria (`pnpm test -- guides/services/guides-db.service.spec.ts --runInBand`, `pnpm build`)
- [ ] Phase 1 manual API check (owner, non-owner, admin JWTs)
- [ ] Phase 2 code and focused unit tests
- [ ] Phase 2 automated criteria
- [ ] Phase 2 manual Manuable API check
- [ ] Final full test suite
