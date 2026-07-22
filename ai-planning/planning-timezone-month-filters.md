# Plan - Timezone Month Filters

**Story:** Make guide and balance-request month/year filtering deterministic in the named business timezone.
**Research doc:** [`ai-research/timezone-month-filters.md`](../ai-research/timezone-month-filters.md)
**Status:** Ready for implementation

## Scope

### In Scope

- Add required, validated `BUSINESS_TIMEZONE` configuration to local and Lambda environments (research policy; AC 1).
- Add a shared Luxon utility for configured business-calendar calculations, then use it for guide/balance month filters and guide calendar-based IDs (AC 1, AC 3; expanded scope).
- Preserve UTC instants for every application-created timestamp. Mongoose timestamps and `new Date()` already do this, so they must not be localized before persistence (expanded scope).
- Preserve `Date` response fields and their existing UTC ISO 8601 JSON wire representation (AC 2).
- Update affected unit tests to prove local-boundary inclusion/exclusion, default-month behavior, and DST-safe named-zone conversion (AC 3).
- Document the frontend integration contract and manual verification, since this repository contains no frontend source (AC 4).

### Out of Scope

- Converting stored MongoDB timestamps, changing API timestamp field types, or returning localized timestamp strings. UTC instants remain the persistence and wire contract.
- Changing the month/year precedence over guide `startDate`/`endDate`; explicit `month`/`year` remains authoritative when both filters are supplied.
- Adding frontend source files or a browser-timezone fallback. The frontend repository must adopt the agreed Luxon policy separately.
- Extending month/year policy to endpoints without an implemented month/year filter. Future date filters must reuse the shared utility when introduced.
- Setting process-level `TZ`; application code must use the configured named zone directly.

## Acceptance-Criteria Traceability

| Acceptance criterion | Planned phases |
| --- | --- |
| AC 1 - timezone used to construct current month/year windows | 1, 2, 3 |
| AC 2 - API timestamp wire format | 2, 3 |
| AC 3 - DST and local month-boundary result | 2, 3 |
| AC 4 - client display responsibility | 4 |

## Technical Decisions

- `BUSINESS_TIMEZONE` is required at bootstrap and must pass Luxon's IANA-zone validation. Current deployment values are `America/Mexico_City`.
- Add Luxon as a direct production dependency. It currently occurs only transitively in `pnpm-lock.yaml`, so application imports must not rely on that incidental dependency.
- Build each monthly range as `[local first-of-month 00:00, local first-of-next-month 00:00)`, converted to UTC `Date` instances for MongoDB. Use `$gte` and `$lt`, not an end-of-day `$lte` sentinel.
- For an omitted month/year, derive both calendar fields from `DateTime.now().setZone(businessTimezone)`, never from host-local `Date#getMonth()`/`getFullYear()`.
- Response DTO fields stay typed as `Date`; Express serialization remains the canonical UTC ISO 8601 `Z` wire representation. No DTO shape change is needed.
- Do not introduce a timestamp-creation wrapper: `new Date()` and Mongoose timestamps already create UTC-representable instants. The shared utility is intentionally limited to business-calendar interpretation, boundary construction, and calendar-based identifiers.
- Guide date-range inputs must be ISO 8601 date-time strings with an explicit `Z` or numeric offset. Reject date-only and offset-free date-time strings at DTO validation, then parse accepted values to UTC instants in the shared utility before building MongoDB predicates.

## Phases

## Implementation Checklist

- [x] Phase 1 - Runtime Timezone Contract
- [x] Phase 2 - Guide Month Query Semantics
- [x] Phase 3 - Balance Request Month Query Semantics
- [ ] Phase 4 - Frontend Contract Handoff

### Phase 1 - Runtime Timezone Contract

**Goal:** Make the business timezone explicit, validated, typed, and available in deployed Lambda environments.

#### Changes Required

**`package.json` - Modify `dependencies`**

- Add `luxon` as a direct production dependency using the repository's pnpm workflow; regenerate `pnpm-lock.yaml` through `pnpm add luxon` during implementation rather than manually editing the lockfile.

**`src/app.module.ts` - Modify `ConfigModule.forRoot()` validation schema at lines 27-62**

- Add required `BUSINESS_TIMEZONE` validation using Luxon's IANA-zone capability, rejecting missing, malformed, unsupported, or non-IANA values before Nest boots.
- Keep all existing environment validation unchanged. The validation must accept `America/Mexico_City` and not depend on Lambda's host timezone.

**`src/config.ts` - Modify environment destructuring at lines 4-37 and returned config object at lines 39-88**

- Read `BUSINESS_TIMEZONE` and expose it as a typed configuration property, colocated with application-level environment/version fields.
- The resulting property is the only timezone source injected by `GuidesDbService` and `BalanceService`.

**`src/date-time/date-time.utils.ts` - Create**

- Add a small, pure Luxon utility for business-calendar operations. Its public functions must accept an object parameter containing `businessTimezone`, optional `month`/`year`, and an optional clock instant for deterministic tests.
- Define `getBusinessMonthRange({ businessTimezone, month, year, now }: BusinessMonthRangeOptions): BusinessMonthRange` and `getBusinessYearMonth({ businessTimezone, now }: BusinessYearMonthOptions): string`; the range result includes resolved `month`/`year`, `startOfMonth`, and `startOfNextMonth` as UTC JS `Date` instances.
- Define `parseOffsetDateTime(value: string): Date`, which accepts only a valid ISO 8601 date-time string containing `Z` or a numeric UTC offset and returns its UTC JS `Date` instant. It must reject date-only and offset-free strings rather than applying a default timezone.
- Return the resolved calendar month/year plus UTC `Date` boundaries for the half-open local-month range; add a narrowly scoped helper for the current business `YYYYMM` identifier component.
- Derive offsets from the named zone for every call. Do not accept a numeric UTC offset, use host-local `Date` component getters, format API response dates, or wrap ordinary `new Date()` timestamp creation.

**`src/date-time/date-time.utils.spec.ts` - Create**

- Cover explicit and default calendar fields, Mexico City local-month boundaries, partial month/year defaults, a DST-changing IANA zone regression, and the business-zone `YYYYMM` result at a UTC month boundary.
- Cover valid `Z`/numeric-offset date-time parsing plus rejection of date-only, offset-free, and malformed inputs.

**`serverless.yml` - Modify `provider.environment` after `NODE_ENV` at lines 12-44**

- Forward `BUSINESS_TIMEZONE: ${env:BUSINESS_TIMEZONE}` to production Lambda.

**`serverless.stage.yml` - Modify `provider.environment` after `NODE_ENV` at lines 12-44**

- Forward the same required setting to stage Lambda.

**`.env-example` - Modify the variable template**

- Add `BUSINESS_TIMEZONE=America/Mexico_City` with the other bootstrap variables. Do not expose or alter secret values in `.env`.

**`.env.local` - Modify the local runtime configuration**

- Add `BUSINESS_TIMEZONE=America/Mexico_City` so the existing `ConfigModule.forRoot({ envFilePath: '.env.local' })` bootstrap path passes the new required validation during local development and tests that load local configuration.
- Preserve all existing local values; only add this non-secret setting.

**`src/config.spec.ts` - Create**

- Exercise the exported/testable timezone validation path used by application configuration: accept `America/Mexico_City`; reject absent, arbitrary text, fixed offsets, and invalid IANA names.
- If implementation keeps the Joi custom rule inline, extract only the timezone predicate/schema needed for this test; do not duplicate environment schemas.

#### Edge Cases

- A syntactically plausible zone that Luxon cannot resolve must fail fast exactly like any other required environment variable.
- The value is runtime configurable, but all deployed environments must be explicitly configured; no fallback to a code constant or process timezone is permitted.

#### Test Coverage

- Valid IANA zone acceptance, invalid zone rejection, and missing-value rejection.
- Config object exposure of the validated zone.
- Shared business-calendar range and `YYYYMM` helper behavior across local boundaries and a DST-changing zone.

#### Success Criteria

- `pnpm exec jest src/config.spec.ts src/date-time/date-time.utils.spec.ts --runInBand`
- `pnpm build`
- Manually verify `BUSINESS_TIMEZONE=America/Mexico_City` is present in `.env.local` and the environment files/secret sources used by production and stage deployment before deploying.

### Phase 2 - Guide Month Query Semantics

**Goal:** Query persisted guides according to the configured business calendar, independent of the Node process timezone.

#### Changes Required

**`src/guides/services/guides-db.service.ts` - Modify imports, `buildBaseQuery()` at lines 776-809, and `generateKraftId()` at lines 870-887**

- Call the shared business-calendar utility with the injected `configService.businessTimezone` rather than importing Luxon or constructing date boundaries locally.
- Replace host-local `new Date()` defaulting with the utility's named-zone current calendar values.
- Use the utility's named-zone local-midnight UTC boundaries instead of `new Date(targetYear, targetMonth - 1, 1)` and last-millisecond end construction.
- Set the automatic monthly MongoDB predicate as `{ $gte: startOfMonth, $lt: startOfNextMonth }`.
- Retain status/provider/tracking filters, deleted filtering, and the existing conditional that uses caller-supplied `startDate`/`endDate` only when no month range is requested; parse accepted raw range strings with `parseOffsetDateTime()` before assigning `$gte`/`$lte` predicates.
- Generate the `KFT-YYYYMM` counter key from the shared utility's business-zone calendar component. Keep the counter `updatedAt: new Date()` value as a UTC timestamp; it is not a calendar interpretation.
- Do not change `formatGuideResponse()` at lines 1152 onward: its `Date` assignments intentionally preserve the UTC wire contract.

**`src/guides/dtos/guides-db.dto.ts` - Modify `GetGuidesQueryDto.startDate` and `.endDate` at lines 51-59**

- Change the query DTO fields to preserve raw request strings through validation rather than transforming them immediately to `Date`.
- Add validation and Swagger format/examples requiring ISO 8601 date-time values with an explicit `Z` or numeric offset. Date-only values such as `2026-02-01` and offset-free date-times such as `2026-02-01T00:00:00` must receive a validation 400 response.
- Keep the service responsible for converting validated strings to UTC instants; do not add browser/local timezone fallback behavior to the DTO.

**`src/guides/services/guides-db.service.spec.ts` - Modify `getGuidesByUser` month tests at lines 369-426 and add focused cases nearby**

- Update constructor config mocks to include `businessTimezone: 'America/Mexico_City'`.
- Assert June 2026's query boundaries are the UTC instants corresponding to Mexico City local midnight and use `$lt` for the next local month, replacing host-local `new Date(year, month, ...)` expectations.
- Test the February 2026 boundary: `2026-02-01T05:59:59.999Z` is excluded and `2026-02-01T06:00:00.000Z` is included for `month=2&year=2026`.
- Test the omitted month/year path with a mocked current instant near a Mexico City month boundary, proving the configured zone determines the selected calendar month.
- Test `generateKraftId()` immediately before and after a Mexico City local-month boundary, proving its counter key changes with the business calendar rather than the host-local calendar.
- Add DTO/service coverage accepting `2026-02-01T00:00:00-06:00` and `2026-02-01T06:00:00Z`, while rejecting date-only, offset-free, and malformed range values before a MongoDB query is built.
- Add a named-zone DST regression using an IANA zone/date with an offset change, asserting adjacent local-month midnights produce the correct UTC range rather than a fixed offset. This proves the Luxon conversion logic even though current Mexico City rules have no seasonal DST.

#### Edge Cases

- The final instant of a local month is included through the exclusive next-midnight bound without relying on millisecond precision.
- A named zone's historic or future offset change may make the UTC duration of a local month differ from a whole multiple of 24 hours; do not calculate bounds by adding UTC days/hours.

#### Test Coverage

- Explicit month/year range, implicit current-month selection, January/February rollover, local-boundary inclusion/exclusion, and DST-offset conversion.
- Month/year precedence, explicit-offset date-range filtering, rejected ambiguous date inputs, and UTC `Date` response serialization.

#### Success Criteria

- `pnpm exec jest src/guides/services/guides-db.service.spec.ts --runInBand`
- `pnpm build`
- Manual API check: create/query records on either side of the documented February 2026 UTC boundary and confirm only the Mexico City calendar-month record is returned.

### Phase 3 - Balance Request Month Query Semantics

**Goal:** Apply the same named-zone month policy to owner and admin balance-request lists.

#### Changes Required

**`src/balance/services/balance.service.ts` - Modify `normalizeFilters()` at lines 400-417 and `monthRange()` at lines 420-428**

- Call the shared business-calendar utility with `configService.businessTimezone` to obtain default month/year and UTC bounds when filters omit either value.
- Preserve the existing `{ $gte, $lt }` return type and use it unchanged in `getRequestsByUser()` (lines 94-126) and `getAllRequests()` (lines 128-160), so owner/admin/status behavior does not change.
- Do not alter `formatRequest()`/`formatAdminRequest()` timestamp assignments: returned `Date` values must remain raw instants for JSON UTC serialization.

**`src/balance/services/balance.service.spec.ts` - Modify constructor setup and add list-query test coverage**

- Supply `businessTimezone: 'America/Mexico_City'` to the config mock.
- Assert both owner and admin list methods issue the same UTC `[start, next-month)` `createdAt` range for an explicit month/year.
- Verify the February 2026 Mexico City boundary inclusion/exclusion and a mocked default-current-month case near local midnight.
- Add the same DST-safe named-zone regression at the shared range behavior level; no fixed offset or host-local expectation may remain.
- Confirm formatted `createdAt`, `updatedAt`, and optional `decisionAt` remain `Date` values, not display-formatted strings.

#### Edge Cases

- The same business-zone calculation must be used for status-filtered admin queries and user-scoped queries.
- Partial filters retain established behavior: a supplied month with no year uses the configured-zone current year, and a supplied year with no month uses the configured-zone current month.

#### Test Coverage

- Owner/admin range equality, explicit and omitted fields, partial month/year inputs, local boundary behavior, DST conversion, and unchanged UTC timestamp response values.

#### Success Criteria

- `pnpm exec jest src/balance/services/balance.service.spec.ts --runInBand`
- `pnpm build`
- Manual API check: request owner and admin list endpoints with the same `month`/`year`, confirming both return the same local-calendar interval while retaining UTC `Z` timestamps in JSON.

### Phase 4 - Frontend Contract Handoff

**Goal:** Make the backend/client boundary implementable without introducing frontend code into this repository.

#### Changes Required

**No application source file in this repository - External frontend implementation requirement**

- Define `America/Mexico_City` as the frontend's canonical display timezone through its own configuration mechanism.
- Use Luxon to parse API ISO timestamps as UTC instants, convert only for display, and leave raw API values unchanged in client state/API handling.
- Submit guide and balance `month`/`year` as calendar query values only; do not derive UTC boundaries in the browser.
- For any date-range UI that sends guide `startDate`/`endDate`, interpret selected calendar dates in the business timezone and submit offset-bearing ISO strings.
- Add frontend tests for Mexico City local-midnight rendering and a DST-boundary named-zone conversion.

#### Success Criteria

- Manual contract verification with the frontend: a timestamp such as `2026-02-01T06:00:00.000Z` displays at Mexico City local midnight regardless of the browser's own timezone.
- The frontend's automated test command is owned by the frontend repository and is intentionally not specified here.

## Implementation Order

1. Complete Phase 1 before changing query logic, so services consume a validated source of truth.
2. Complete and verify Phase 2 and Phase 3 independently.
3. Deliver the external Phase 4 handoff alongside backend release coordination.

## Assumptions

- Production and stage deployment secret sources can supply `BUSINESS_TIMEZONE=America/Mexico_City` before the application is deployed.
- MongoDB `createdAt` values are UTC instants, as Mongoose timestamps currently provide.
- There is no frontend application in this workspace; its changes are tracked and tested in the client repository.

## Unresolved Questions

None. Frontend implementation is an external, explicitly defined dependency rather than an unresolved policy decision.

## Decisions Beyond Research

- Use half-open MongoDB month ranges (`$gte` / `$lt`) for both services; this removes the guide service's end-of-day millisecond sentinel while preserving the agreed inclusive-start/exclusive-next-midnight policy.
- Add Luxon as a direct dependency because the lockfile's transitive copy is not a supported application dependency.
- Reuse a shared business-calendar utility for filtering and calendar-derived IDs, but retain Mongoose timestamps and `new Date()` for persisting ordinary UTC instants. The audit found no other date-filter implementations to migrate.
- Reject date-only and offset-free guide date-range inputs instead of guessing a timezone. Valid date ranges are explicit UTC instants before MongoDB receives them.
