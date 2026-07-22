# Timezone Frontend Contract

Backend month/year filters for guides and balance requests are interpreted in the configured business timezone. The current backend deployment value is `America/Mexico_City` via `BUSINESS_TIMEZONE`.

Frontend requirements:

- Use `America/Mexico_City` as the canonical display timezone through frontend configuration.
- Parse API timestamp strings as UTC instants, convert only for display, and keep raw API values unchanged in client state and API handling.
- Submit guide and balance `month`/`year` query parameters as business-calendar values only. Do not derive UTC boundaries in the browser.
- For guide `startDate`/`endDate` range filters, interpret selected calendar dates in the business timezone and submit ISO 8601 date-time strings with an explicit `Z` or numeric offset, for example `2026-02-01T00:00:00-06:00`.
- Add frontend tests proving `2026-02-01T06:00:00.000Z` displays as Mexico City local midnight regardless of browser timezone, plus a named-zone DST conversion regression.

Backend timestamp contract:

- Stored timestamps remain UTC instants from MongoDB/Mongoose or ordinary `new Date()` usage.
- Response fields remain `Date` values serialized as UTC ISO 8601 strings ending in `Z`.
- The frontend owns display localization; the backend does not return localized timestamp strings.
