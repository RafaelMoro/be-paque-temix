# Timezone month filters - planning constraints

- `BUSINESS_TIMEZONE` is required runtime configuration and must be validated as a Luxon-supported IANA zone. The current policy value is `America/Mexico_City`.
- Never derive month defaults or MongoDB month boundaries from host-local `Date`; derive them in the configured zone and query with `[local month start, next local month start)` converted to UTC instants.
- API timestamp `Date` fields remain UTC ISO 8601 instants. Frontends must use Luxon and the same business zone only for display; this repository has no frontend source.
- Mongoose timestamps and `new Date()` already persist timezone-independent UTC instants. Reuse the shared business-calendar utility only when interpreting calendar values, filtering by dates, or constructing calendar-based identifiers such as `KFT-YYYYMM`.
- Guide `startDate` and `endDate` inputs must include an ISO 8601 `Z` or numeric offset. Reject date-only and offset-free strings; do not silently treat them as UTC or business-zone midnight.
