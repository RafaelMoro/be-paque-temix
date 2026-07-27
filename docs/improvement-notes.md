# Backend Improvement Notes

Living list of known gaps, deliberate shortcuts, and follow-ups in the BE.
Append-only — resolve by moving items to a "Done" entry with the PR/commit.

## Format

- **Status:** `open` | `done`
- **Area:** module / endpoint touched
- **Context:** why it matters
- **Plan:** minimal next step

---

## open

### Empty-payload validation for PATCH guide db

- **Status:** done (2026-07-09)
- **Area:** `src/guides/services/guides-db.service.ts:345` (`updateGuideData`)
- **Context:** `UpdateGuideDto` is all-optional by design (partial update), so an empty `{}` body passed class-validator and silently re-issued the guide with the provider using existing data.
- **Plan:** throw `KraftError(GDE_BDN_013, "Update payload cannot be empty")` at the top of the method, before any DB/provider call. Constant + message in `guides-db.constants.ts`.

### PATCH guide db ownership enforcement

- **Status:** done (verified 2026-07-09)
- **Area:** `src/guides/services/guides-db.service.ts:624` (`findAccessibleGuide`)
- **Context:** Verified that `updateGuideData` already passes `isAdmin: false`, and `findAccessibleGuide` injects `userId` into the Mongo query when not admin — non-admins can only access their own guides.
- **Plan:** none. Kept here as a reference so future PATCH endpoints route through the same helper.

### Failing test suites in `pnpm test`

- **Status:** done (verified 2026-07-13 - All tests passing successfully)
- **Area:** `src/mail/services/mail.service.spec.ts`, `src/auth/guards/jwt-guard/jwt-guard.guard.spec.ts`
- **Context:** 542/546 pass. Mail suite fails on React/jsx-runtime load; JWT-guard spec imports `IS_PUBLIC_KEY` from `@/auth/auth.constant` but the symbol is missing.
- **Plan:** fix the two missing pieces (jsx-runtime config for the spec, missing `IS_PUBLIC_KEY` export or corrected import path) and re-run.

### `manuable.interface.ts` courier / tracking / waybill typing

- **Status:** open
- **Area:** `src/manuable/manuable.interface.ts:145-150`
- **Context:** `TODO` comments flag three `TODO` updates to types (courier, tracking status, waybill).
- **Plan:** read the corresponding external-API responses, replace `any`/loose unions with concrete types.
