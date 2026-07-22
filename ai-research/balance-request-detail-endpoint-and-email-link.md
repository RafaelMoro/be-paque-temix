# Research: Single balance-request detail endpoint + email deep link

## Story

Add a single-request GET endpoint so the frontend can render all details of one
balance request, and turn the plain text in the `BalanceRequestCreated` email
into a working link button that redirects admins to the frontend route
`/dashboard/requests/{requestId}`.

Two coupled deliverables:
1. **API** — a single-request detail endpoint (admin-only) returning the full
   admin view of one balance request.
2. **Email** — pass `requestId` into the notification and replace the current
   text with a `Link` button to `${FRONTEND_URI}/dashboard/requests/{requestId}`.

## Decisions (confirmed with user)

- **Access model:** Admin-only route. New endpoint is `GET /balance/requests/admin/:id`
  guarded by `JwtGuard + RolesGuard` + `@Roles('admin')`. Admins can fetch **any**
  request and receive **admin-level detail**. No user-scoped single-detail view in
  this story.
- **Email:** Full link change — add `requestId` to the mail flow, build the URL,
  and replace the informational text with a `Link` button (ResetPassword pattern).

## Acceptance criteria

1. `GET /balance/requests/admin/:id` returns one balance request in the
   `AdminBalanceRequestResponseDto` envelope (admin detail: `userEmail`,
   `userName`, `adminInCharge` plus base fields). Admin can read any user's request.
2. Non-admins are rejected by `RolesGuard` (403); unauthenticated requests are
   rejected by `JwtGuard` (401). A missing/invalid id returns `BAL_NF_001` /
   `MSG_BALANCE_REQUEST_NOT_FOUND` (404) via `KraftError`, not a raw 500.
3. The `BalanceRequestCreated` email renders a link button pointing to
   `${FRONTEND_URI}/dashboard/requests/{requestId}`.
4. `requestId` (the request `_id`) flows from `notifyRequestCreated` → mail DTO →
   email template props; email failure still does not fail request creation.
5. Existing behavior (amount, payment reference, created date content) preserved
   as decided (button added, existing detail lines kept per "Button only" was
   not chosen — full link change replaces the CTA area while keeping detail lines).

## Affected files & modules

### API endpoint (BalanceModule)
- `src/balance/controllers/balance.controller.ts` — add `@Get('requests/admin/:id')`.
  **Ordering constraint:** must be declared after the static `@Get('requests/admin')`
  (list) route and after `@Get('requests')`, but the `/admin/:id` prefix avoids
  colliding with `requests/:id`-style dynamic matching. Extract `req.user as
  BalanceCaller` and pass raw to the service (controllers stay thin).
- `src/balance/services/balance.service.ts` — add a public method
  (e.g. `getRequestByIdAdmin(user, requestId)`) modeled on the find/not-found half
  of `cancelRequest` (lines 188-196) but using `getAdminCaller` (lines 387-398)
  for the admin gate, returning `envelope({ request: formatAdminRequest(request) })`
  (helpers at 443-452 / 454-466). No mutation.
- No new DTO required: `AdminBalanceRequestResponseDto` /
  `AdminBalanceRequestItemDto` already exist
  (`src/balance/dtos/balance-responses.dto.ts:74-86 / 49-58`).
- No new constants required: reuse `BAL_NF_001` + `MSG_BALANCE_REQUEST_NOT_FOUND`
  and `getAdminCaller`'s `BAL_AUTH_002` + `MSG_BALANCE_REQUEST_FORBIDDEN`
  (`src/balance/balance.constants.ts`).

### Email deep link (Mail + Balance + template)
- `emails/BalanceRequestCreated.tsx` — add `requestId` (and the built `url`) to
  props; add a `Link` CTA. Pattern to follow: `emails/ResetPassword.tsx:45-54`
  (`Row` / `Column align="center"` / `Link href={url}` with the blue button
  classes). Import `Link`, `Row`, `Column` from `@react-email/components`.
- `src/mail/dtos/mail.dto.ts` — `MailBalanceRequestCreatedDto` (lines 44-63):
  add a `requestId: string` field (validated, e.g. `@IsString() @IsNotEmpty()`).
- `src/mail/services/mail.service.ts` — `sendBalanceRequestCreatedEmail`
  (lines 51-73). It currently spreads the whole DTO as component props
  (`React.createElement(BalanceRequestCreated, payload)`). The frontend URL is
  built from `this.configService.frontend.uri` (see existing usage line 31:
  `${this.configService.frontend.uri}/reset-password/${oneTimeToken}`). Decide
  whether the URL is built here (mirrors ResetPassword) or passed in; template
  props must ultimately receive a usable `url` or `requestId` to build it.
- `src/balance/services/balance.service.ts` — `notifyRequestCreated`
  (lines 468-490): add `requestId: request._id.toString()` to the payload
  (`request._id` already used at `formatRequest` line 432).

## Existing patterns to follow

- **Ownership/admin gate + not-found:** `cancelRequest` (service 182-222) is the
  closest template for find → 404 → access check.
- **Admin gate helper:** `getAdminCaller` (387-398) already enforces
  `role.includes('admin')` → 403.
- **Response envelope + admin shaping:** `formatAdminRequest` (443-452) +
  `envelope` (454-466); response typed with `AdminBalanceRequestResponseDto`.
- **Error handling:** wrap in try/catch, rethrow `KraftError` (or map via
  `rethrowDatabaseError`, 526-532) — never a raw 500 (per AGENTS.md).
- **Email button:** `ResetPassword.tsx` Link/Row/Column CTA + config
  `frontend.uri` URL construction.
- **Mail is best-effort:** `notifyRequestCreated` already swallows errors with
  `console.error` (484-489) — keep that.

## Dependencies & integration points

- `req.user` shape = `PayloadToken` (`{ email, name, lastName, role: Role[] }`,
  `src/auth/auth.interface.ts:4-9`) = `BalanceCaller`.
- `RolesGuard` requires `@Roles('admin')` and must come after `JwtGuard`.
- Frontend contract: FE route `/dashboard/requests/{requestId}` calls
  `GET /balance/requests/admin/:id`; `requestId` = Mongo `_id` string returned as
  `id` in the item DTO.
- Config: `config.frontend.uri` (`src/config.ts:54-56`, `FRONTEND_URI`, Joi-required).

## Edge cases & constraints

- Malformed `:id` (non-ObjectId) — `findById` may throw a CastError; must be
  mapped to a 404/`KraftError`, not a 500.
- Route ordering: keep `/requests/admin` (list) and `/requests/admin/:id`
  (detail) unambiguous; the `:id` segment is only reached for non-`admin`-suffixed
  paths, so declaration order still matters relative to other `requests/*` routes.
- Email `createdAt` is a `Date`; `requestId` must be a string before it reaches
  the React template.
- Amount stored in cents; DTO exposes decimal `amount` via `fromMoneyCents` —
  no change needed.
- Email link must not break existing best-effort semantics (no throw on failure).

## Open questions

1. Where should the deep-link URL be constructed — in `MailService`
   (mirrors ResetPassword, template receives `url`) or in `notifyRequestCreated`
   (template receives `requestId` and builds nothing)? Leaning toward MailService
   for consistency with ResetPassword. **Planning decision.**
2. Button label copy in Spanish (e.g. "Ver solicitud")? Confirm wording.
3. Should the detail lines (amount/reference/date) remain alongside the new button?
   (User picked "Full link change"; assumed detail lines stay, CTA added.)

## Assumptions

- No user-facing single-request endpoint is needed now (admin-only per decision);
  can be added later if the FE needs a user detail view.
- `AdminBalanceRequestResponseDto`/`AdminBalanceRequestItemDto` are sufficient —
  no new response shape.
- Adding `requestId` to `MailBalanceRequestCreatedDto` is safe; the only caller is
  `notifyRequestCreated`.
- No new env vars; `FRONTEND_URI` already validated and available.
