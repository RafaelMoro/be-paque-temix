# Guides DB Conditional PATCH Research

**Last updated:** 2026-07-17
**Status:** Awaiting sign-off

## Story

### Title

Restrict Guides DB edits by quote ID and allow admins to edit any guide.

### Description

The existing `PATCH /guides/db/:guideId` must distinguish edits that reuse the stored quote from edits that submit a different quote. With the same effective quote ID, only changed parcel `content` and/or `satProductId` are valid. With a different quote ID, all fields currently exposed by `UpdateGuideDto` remain valid. Regular users may edit only their own guides; admins may edit any non-deleted guide.

When a PATCH provider call rejects the quote as expired, an unchanged quote ID must produce the existing quote-expiration validation response identified by `GDE-PVR-006` and `MSG_QUOTE_EXPIRED`.

### Acceptance Criteria

1. When PATCH omits `quote.id` or sends the stored quote ID, the backend accepts changes only to `parcel.content` and/or `parcel.satProductId`; attempts to change parcel measurements, quote metadata, addresses, or `notifyMe` are rejected as validation errors.
2. When PATCH sends a quote ID different from the stored quote ID, all current update sections remain accepted: `quote`, `parcel`, `origin`, `destination`, and `notifyMe`.
3. If the provider rejects an unchanged quote during PATCH as expired, the response uses `GDE-PVR-006` with `MSG_QUOTE_EXPIRED` (`Quote has expired, please create a new quote before updating the guide`).
4. A regular user can PATCH only a guide they own. An admin can PATCH any non-deleted guide. Cross-owner access by a regular user remains indistinguishable from a missing guide.
5. Successful edits and provider failures retain the existing Guides DB response envelope and structured `KraftError` behavior; unexpected async failures do not escape as raw 500 responses.

### Scope

This is a single story spanning the existing Guides module, its provider integrations, and owner/admin authorization. It does not require a new endpoint.

Out of scope:

- Changing `POST /quotes`, guide creation, retry, sync, status, or delete contracts.
- Persisting quotes in a new collection or revalidating quote IDs against quote APIs.
- Refactoring provider integrations or unrelated Guides DB behavior.
- Frontend changes.

## Current State

### Endpoint and update flow

- `PATCH /guides/db/:guideId` already exists at `src/guides/controllers/guides-db.controller.ts:152-164`; `.github/REPO_CONTEXT.md` is stale and lists only the status PATCH.
- The controller is protected by the controller-level `JwtGuard`, but the general PATCH has no `RolesGuard` and does not pass admin status to the service.
- `GuidesDbService.updateGuideData` is at `src/guides/services/guides-db.service.ts:348-426`.
- The service rejects `{}`, resolves the JWT email to a database user ID, and currently calls `findAccessibleGuide` with `isAdmin: false`. Admins are therefore limited to their own guides.
- Every accepted non-empty PATCH reissues a guide through the stored provider before MongoDB is updated. This is not a database-only edit.
- Supplied `quote`, `parcel`, `origin`, and `destination` sections replace their complete stored subdocuments rather than merging individual nested fields.
- A provider success replaces tracking fields and records the previous `externalId`; a generic provider failure still persists supplied data and stores `status: failed` plus `failureInfo`.

### Request and persisted data shapes

`UpdateGuideDto` currently accepts these optional top-level sections at `src/guides/dtos/guides-db.dto.ts:324-353`:

| Request path | Persisted path | Current constraint |
| --- | --- | --- |
| `quote.id` | `quoteData.quote.id` | Required whenever `quote` is present |
| `parcel.content` | `parcel.content` | Required whenever `parcel` is present |
| `parcel.satProductId` | `parcel.satProductId` | Required whenever `parcel` is present |
| `parcel.length` | `parcel.length` | Required number whenever `parcel` is present |
| `parcel.width` | `parcel.width` | Required number whenever `parcel` is present |
| `parcel.height` | `parcel.height` | Required number whenever `parcel` is present |
| `parcel.weight` | `parcel.weight` | Required number whenever `parcel` is present |
| `origin` | `origin` | Full address DTO when present |
| `destination` | `destination` | Full address DTO when present |
| `notifyMe` | Not persisted | Forwarded only to the provider call |

The current `ParcelDto` cannot represent a content-only or SAT-ID-only PATCH because all six core parcel fields are required together. `value` and `quantity` are optional but default to `1` when a parcel body is validated.

The quote ID type is `string | number` in TypeScript, has only `@IsNotEmpty()` runtime validation, and is stored by Mongoose as a string (`src/guides/entities/guide.entity.ts:37-49`).

Local and Lambda bootstraps use `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` (`src/main.ts:24-30`, `lambda.ts:28-34`). Unknown top-level or nested PATCH fields are rejected with HTTP 400.

### Quote rejection behavior

- `GDE-PVR-006` denotes provider quote expiration (`src/guides/guides-db.constants.ts:27-38`).
- `MSG_QUOTE_EXPIRED` is defined at `src/guides/guides-db.constants.ts:68-69`.
- During PATCH, any provider result classified as `GDE-PVR-006` currently throws that error and message without comparing submitted and stored quote IDs or updating the guide.
- Quote expiration is not calculated from time metadata. Quotes and guide snapshots contain no issued-at or expires-at field.
- Only Manuable currently has an expiration/reuse detector. It maps `Rate request already has a label` to `GDE-PVR-006` (`src/guides/services/guides-db.service.ts:876-903`).
- The detector reads Axios-like error fields, while Manuable can wrap provider failures in `BadRequestException`. Some real provider response shapes can therefore retain the expiration text but fall back to a generic Kraft provider code.
- Initial creation can persist `failureInfo.errorCode`; retry stores codes in retry attempts, but retry history is not returned by the guide response formatter. PATCH expiration itself is returned immediately and is not persisted.

### Authorization behavior

- JWT payloads carry email and role, not the MongoDB user ID. Guides DB resolves the user ID through `UsersService.findByEmail`.
- Admin role is represented by a role string or array containing `admin`; `RolesGuard` requires all roles listed by `@Roles`.
- `findAccessibleGuide` applies `userId` ownership only when `isAdmin` is false and always excludes soft-deleted records (`src/guides/services/guides-db.service.ts:631-660`).
- `POST /guides/db/:guideId/sync` is the existing owner-or-admin access pattern: the controller derives admin status from `req.user.role`, and the service uses it in the shared lookup (`src/guides/controllers/guides-db.controller.ts:108-122`).
- Admin-only mutations instead use `JwtGuard`, `RolesGuard`, and `@Roles('admin')`; that pattern would not allow regular owners.

## Existing Patterns to Follow

- Controllers remain thin and pass the authenticated request user to the service.
- Owner/admin guide access uses `findAccessibleGuide`; unauthorized cross-owner access returns the same `GDE-NF-001` result as a missing guide.
- Async guide mutations catch unexpected errors, rethrow existing `KraftError`, and wrap other errors in a guide-specific `KraftError`.
- Guide mutations return `GuideResponseDto`; validation and Kraft errors are wrapped by `GeneralExceptionFilter`.
- DTOs define the public request contract and global whitelist validation rejects fields outside it.
- Service tests are colocated in `src/guides/services/guides-db.service.spec.ts`; no Guides DB controller spec currently exists.

## Dependencies and Integration Points

- `src/guides/controllers/guides-db.controller.ts`: route and authenticated role context.
- `src/guides/dtos/guides-db.dto.ts`: conditional PATCH request contract and nested validation limits.
- `src/guides/services/guides-db.service.ts`: ownership lookup, quote comparison context, provider call, expiration mapping, persistence, and response formatting.
- `src/guides/guides-db.constants.ts`: `GDE-PVR-006` and the required expiration message.
- `src/guides/entities/guide.entity.ts`: persisted quote and parcel shapes, ownership, failure information, and soft-delete filtering.
- `src/guides/services/guides-db.service.spec.ts`: existing update, expiration, provider failure, and mutation coverage.
- `src/auth/guards/roles/roles.guard.ts`, `src/auth/auth.interface.ts`, and `src/express.d.ts`: admin claim and request-user representation.
- `src/users/services/users.service.ts`: email-to-user-ID resolution.
- Provider guide services consume the merged update payload. GE uses quote ID, content, SAT ID, and parcel measurements; TONE uses quote ID and content; Manuable uses quote ID, content, and SAT ID; Pakke uses content and measurements but ignores quote ID.

## Edge Cases and Constraints

- Omitting `quote` reuses the stored quote ID, so it falls under the same-quote rule.
- `content` and `satProductId` must be independently editable; the current shared parcel DTO requires both plus all measurements.
- Sending unchanged values only may leave no meaningful database update while the current flow still performs an external provider call.
- Numeric and string representations of the same quote ID may compare differently before Mongoose casts the stored value.
- A submitted quote object can contain a changed ID but omit optional quote metadata; current replacement behavior can remove stored metadata.
- A new quote ID does not prove that parcel measurements match the quote because quote requests are not persisted or re-fetched.
- Pakke ignores quote ID during guide creation, so a changed ID does not alter its provider request.
- Provider creation occurs before database persistence. A successful provider call followed by a database failure can leave an external guide without the corresponding local update.
- Concurrent PATCH requests can each create provider guides and race on the final document because there is no transaction or optimistic concurrency check.
- Soft-deleted guides remain inaccessible to owners and admins through this route.

## Decisions

1. If a newly submitted quote ID is rejected by the provider as expired, PATCH returns `GDE-PVR-006` with `MSG_QUOTE_EXPIRED`; the client must create a new quote and try again. Do not persist it as a normal failed-provider result because that makes an expired quote look like a guide-generation failure.
2. Quote ID equality normalizes both values with `String(value)` before comparison, so numeric `123` and string `"123"` are treated as the same quote. This matches the persisted Mongoose string shape and prevents a false "new quote" path when validation receives a numeric ID.
3. A same-quote request with no actual `content` or `satProductId` value change is rejected as an empty/no-op update.

## Assumptions

- "All current fields" for a changed quote means every section already exposed by `UpdateGuideDto`: `quote`, `parcel`, `origin`, `destination`, and `notifyMe`.
- With no quote in the request, the effective quote ID is the stored ID.
- Same-quote edits may change `content`, `satProductId`, or both independently.
- The required expiration response is the existing `GDE-PVR-006` Kraft error with `MSG_QUOTE_EXPIRED`, not text matching against persisted provider messages.
- Admin status continues to come from the signed JWT role claim; role changes in MongoDB do not affect an existing token.
- Existing provider reissue and response-envelope behavior remains in scope unless it conflicts with the conditional validation rules.
