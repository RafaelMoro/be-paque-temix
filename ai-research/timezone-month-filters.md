# Timezone Semantics For Month Filters And Timestamps

## Story

Establish the current behavior and the unresolved policy for monthly filters and date-time display in guides and balance requests.

## Acceptance Criteria

- Identify the timezone used to construct current month/year query windows.
- Identify the API timestamp wire format.
- State the expected result for DST transitions and records at a local month boundary once a business timezone is agreed.
- Identify the client-side display responsibility and any unresolved decision.

## Findings

- `GuidesDbService.buildBaseQuery` constructs monthly bounds with `new Date(year, monthIndex, day)` in `src/guides/services/guides-db.service.ts:776-789`. This uses the Node process's local timezone, not UTC and not an explicitly named IANA timezone. Its unit test asserts that same host-local construction in `src/guides/services/guides-db.service.spec.ts:369-388`.
- `BalanceService.monthRange` uses the same host-local construction in `src/balance/services/balance.service.ts:420-428`.
- `serverless.yml` does not set `TZ` or a timezone configuration. Thus production's effective behavior depends on the Lambda runtime environment; it is not a durable timezone contract.
- Guides and balance records are Mongoose timestamp fields. Response formatting returns the `Date` objects unchanged in `src/guides/services/guides-db.service.ts:1152-1161` and `src/balance/services/balance.service.ts:430-440`. Nest/Express JSON serialization serializes `Date` values as ISO 8601 UTC strings with `Z`.
- No backend or repository-level frontend code establishes an agreed display timezone.

## Agreed Policy

- Use the named IANA business and display timezone `America/Mexico_City`.
- Use Luxon for named-timezone conversion in the backend and frontend.
- Keep persisted and API timestamps as UTC ISO 8601 instants, for example `2026-02-01T06:00:00.000Z`.
- Interpret `month` and `year` as calendar values in `America/Mexico_City`. The query range should be inclusive at local midnight on the first day and exclusive at local midnight on the first day of the next month.
- The frontend must render returned UTC instants in `America/Mexico_City`, rather than relying on each browser's local timezone. It must not alter the raw API values.
- Never use a fixed UTC offset; Luxon must derive each local boundary's actual offset from IANA timezone data.

## Frontend Contract

- Define the same canonical `America/Mexico_City` timezone value in the frontend configuration. It must not use the browser's detected timezone as the display policy.
- Parse API timestamps as UTC instants and convert them to the business zone only for presentation.
- For month filtering, send calendar values only, such as `month=1&year=2026`; the frontend must not derive or submit UTC month boundaries.
- If a date-range UI uses `startDate` and `endDate`, interpret selected dates in the business timezone before submitting offset-bearing ISO values.
- Frontend tests must cover local month-midnight rendering and DST-boundary conversion.

## Boundary And DST Behavior

- A record belongs to the month containing its instant when viewed in the business timezone. With an `America/Mexico_City` policy at UTC-06:00, `2026-02-01T05:59:59.999Z` belongs to January and `2026-02-01T06:00:00.000Z` belongs to February.
- On a DST transition, the local month boundary remains local midnight and its UTC equivalent uses the offset in effect at that boundary. A month can therefore span a nonstandard number of UTC hours. Repeated or skipped local clock times are still unambiguous because stored timestamps are UTC instants.
- `America/Mexico_City` currently has no seasonal DST changes, but IANA timezone data preserves historic transitions and can change with future rules. This does not remove the need for named-zone conversion.

## Affected Areas

- `src/guides/services/guides-db.service.ts`
- `src/balance/services/balance.service.ts`
- `src/guides/dtos/guides-db.dto.ts`
- `src/balance/dtos/balance.dto.ts`
- Guide and balance request response DTOs

## Remaining Planning Inputs

- Confirm whether the timezone should be deployed as a validated environment variable (recommended for a runtime-configurable policy) or as a code constant. This determines the configuration and deployment scope.
- This research covers guide and balance-request month/year filters, the only implemented month/year filters found in the backend.
