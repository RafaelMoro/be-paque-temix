# Balance Feature Research

## Overview

Add a user **Balance** (a per-user wallet) that grows through admin-validated **Balance Requests**. A user creates a request to add funds (after depositing money externally); admins are notified by email, verify the transaction out-of-band, and approve or reject it. On approval the user's wallet is credited and the user is notified by email. Users can cancel their own pending requests (no notification is sent), and both users and admins can browse requests by month/year. The wallet is **spent when a guide is created**: guide creation must verify the user's balance covers the guide total and debit it.

This feature mirrors the existing **guides-db** module, which is the closest analog (per-user ownership, admin vs user views, month/year filtering, status lifecycle, `KraftError` handling, response envelopes). Reuse its patterns rather than inventing new ones.

## Confirmed Decisions (from stakeholder)

1. **Balance model** — Persistent per-user wallet `Balance { userEmail, amount }`. Approving a request atomically adds the request `amount` to the user's `Balance`.
2. **User linkage by email** — Both `Balance` and `BalanceRequest` link to the user via `userEmail: string` (from the JWT), **not** an ObjectId ref. The admin view resolves the display name by email → name.
3. **Admin routing** — *Claimed at approval*. No pre-assignment and no new field on `User`. On create, **all** admins are emailed; `adminInCharge` is empty until an admin approves/rejects, at which point it records the acting admin's email.
4. **Decision flow** — Admin can **approve or reject** a pending request; a `reason` is **optional** on both and is included in the user notification email. **Single** decision route (`action` discriminator), not split approve/reject routes.
5. **Request payload** — `amount` (required) plus an **optional** `paymentReference` (transfer reference / concept text) the admin uses to match the deposit. No receipt upload in scope.
6. **Approval payload** — the admin also passes a `paymentReference` string on approval to record/confirm the verified reference on the request (in addition to the optional `reason`).
7. **Amount precision** — decimal fixed to **2 decimals, truncated** (`19.487 → 19.48`).
8. **Multiple requests** — a user may have **many** balance requests, including multiple simultaneously pending. No open-request guard.
9. **Cancel** — only a **pending** request can be cancelled (by its owner).
10. **Spend on guide creation** — creating a guide must check `Balance.amount >= guide total`; if covered, create the guide and **debit** the total from the wallet; otherwise reject with insufficient-balance.

## Acceptance Criteria

1. A user can `POST` a balance request with `{ amount, paymentReference? }`; it is persisted with `status: 'pending'`, `adminInCharge: null`, owned by the caller, and **all admins receive a notification email**.
2. An admin can approve or reject a pending request with an optional reason; approval **atomically credits the user's `Balance.amount`** and records `adminInCharge`, and the **requesting user is notified by email** of the outcome. Rejection changes status only (no wallet change).
3. A user can cancel **their own pending** request; status becomes `cancelled`. **No notification email is sent on cancellation.** The service validates the caller owns the request (`req.user.email` === the request's `userEmail`) before cancelling. Requests that are not `pending` cannot be cancelled.
4. A user can list **their own** requests filtered by month/year (both **optional**, defaulting to the current month/year) and see each request's status; a user never sees `adminInCharge`.
5. An admin can list requests filtered by month/year (optional, default current), filter by **pending-only or all** statuses, with each request showing the requesting user's **name** resolved from `userEmail`.
6. Creating a guide **validates the user's balance covers the guide total** (`quote.total`) *before* creating anything; if insufficient, guide creation is rejected with a business error and the wallet is unchanged. When covered, the guide is created, the total is **debited via an atomic guarded update immediately before the provider call**, then the provider API is called. The debit **stays regardless of provider success or failure** — a `failed` guide holds the debit and retrying it does not re-charge. In the rare case the guarded debit finds the balance no longer sufficient (drained by a concurrent creation after the initial check), the guide is rejected for insufficient balance and the provider is not called.

## Scope

Single feature, best delivered as one story with clear phases (entities → service/CRUD + wallet crediting → controller/guards → email templates + notifications → **guide-creation check-and-debit integration**). Sized comparably to a subset of guides-db, plus a cross-module touch into `GuidesDbService` for spending the balance at guide creation. Not an epic.

## New Module & File Structure

New `src/balance/` module, registered in `src/app.module.ts` `imports`. Mirror guides-db layout:

```
src/balance/
├── balance.module.ts
├── balance.constants.ts        # error codes (BAL-*) + MSG_* + status consts
├── balance.interface.ts        # DTO-derived type aliases
├── controllers/
│   └── balance.controller.ts   # route prefix 'balance'
├── services/
│   └── balance.service.ts
├── entities/
│   ├── balance.entity.ts
│   └── balance-request.entity.ts
└── dtos/
    ├── balance.dto.ts          # request/query DTOs
    └── balance-responses.dto.ts
```

Email templates go in `emails/` (project root), alongside `emails/ResetPassword.tsx`.

**Module wiring** (`balance.module.ts`): `MongooseModule.forFeature([Balance, BalanceRequest])`; `imports: [UsersModule, MailModule]`; `providers: [BalanceService]`; `controllers: [BalanceController]`; **`exports: [BalanceService]`** (so `GuidesModule` can debit the wallet at guide creation). (`UsersModule` already exports `UsersService`; `MailModule` already exports `MailService`.)

`GuidesModule` then adds `imports: [BalanceModule]` and `GuidesDbService` injects `BalanceService`. No circular dependency: `BalanceModule` does not import `GuidesModule`.

## Data Shapes

**User linkage — by email, not ObjectId.** Both entities link to the user through `userEmail: string` (taken directly from `req.user.email` on the JWT). This drops the `getUserId()` email→ObjectId round-trip entirely — the JWT already carries `email`. The requesting user's **name** for the admin view is resolved by looking up the users collection by email (see "Resolving user name by email" below).

### `Balance` entity (persistent wallet)
- `@Schema({ timestamps: true, collection: 'balances' })`
- `userEmail: string` — **unique**, indexed (one wallet per user)
- `amount: number` — default `0`; stored as a 2-decimal money value (see amount precision)
- Created lazily on first approval via upsert.

### `BalanceRequest` entity
- `@Schema({ timestamps: true, collection: 'balance_requests' })` → `createdAt` is the request "date and time"; `updatedAt` auto.
- `userEmail: string` — required, indexed (owner). A user can have **many** balance requests.
- `amount: number` — required, must be `> 0`; truncated to 2 decimals (see amount precision)
- `paymentReference?: string` — optional; supplied by the **user at creation** (the transfer reference/concept they used) and/or **confirmed/overwritten by the admin at approval**. The approval payload includes `paymentReference` so the admin records the verified reference on the request.
- `status: 'pending' | 'approved' | 'rejected' | 'cancelled'` — enum, default `'pending'`, indexed
- `adminInCharge?: string` — admin **email** (set on approve/reject); admin-only visibility
- `decisionReason?: string` — optional reason captured at approve/reject
- `decisionAt?: Date` — timestamp of approve/reject
- Compound indexes to mirror guides: `{ userEmail, createdAt: -1 }`, `{ status, createdAt: -1 }`, `{ createdAt: -1 }`.
- `export type BalanceRequestDoc = BalanceRequest;` (DTO/entity-derivation rule).

### amount precision (money)
- `amount` is a **decimal fixed to 2 decimals, truncated** (not rounded): `19.487 → 19.48`. Apply a truncation helper — `Math.floor(value * 100) / 100` — on input (create) and on any computed wallet math.
- MongoDB stores `number` as a double, so repeated `$inc` can accumulate float drift. Keep every wallet-affecting value truncated to 2 decimals; the plan should decide between (a) truncate-on-write with periodic normalization, or (b) storing integer **cents** internally and formatting to 2 decimals on output (safer — flag for plan phase).

### Status enum
`['pending','approved','rejected','cancelled']`. Follow the guides convention (inline arrays duplicated in schema + DTO); optionally centralize as a const in `balance.constants.ts` to avoid the drift guides currently has.

## API Endpoints

Route prefix `balance`. Class-level `@UseGuards(JwtGuard)`. Admin endpoints add `@UseGuards(JwtGuard, RolesGuard) @Roles('admin')`.

| Method & path | Actor | Body / Query | Purpose |
| --- | --- | --- | --- |
| `POST /balance/requests` | user | `{ amount, paymentReference? }` | Create pending request owned by `req.user.email` (userEmail stored from the JWT, not the body); email all admins |
| `GET /balance/requests` | user | `?month&year&page&limit` | List **own** requests by month/year |
| `GET /balance/requests/admin` | admin | `?month&year&status&page&limit` | List all requests, resolving `userEmail`→`name`; `status` filters pending-only vs all |
| `PATCH /balance/requests/:id/decision` | admin | `{ action: 'approve' \| 'reject', reason?, paymentReference? }` | Approve (credits wallet) or reject; email user |
| `PATCH /balance/requests/:id/cancel` | user | — | Cancel own pending request (service validates `req.user.email` === request `userEmail`); no email sent |
| `GET /balance` | user | — | Read own current wallet `amount` (also checked at guide creation) |

Notes:
- Identify the caller by `req.user.email` (there is **no** `userId`/`sub` on the JWT payload) and store/query `userEmail` **directly** — no ObjectId resolution step. This is simpler than the guides `getUserId()` pattern, which only exists because guides stores `userId` as an ObjectId ref.
- Admin check inline: `req.user?.role?.includes('admin') ?? false`.
- Admin decision endpoint uses **one** PATCH with an `action: 'approve' | 'reject'` discriminator (confirmed — single route, not split). Keeps reason/paymentReference handling in one place.
- **Cancel ownership guard (confirmed):** the cancel PATCH must verify the JWT identity matches the request owner — reject unless `req.user.email` === the request's `userEmail` — so a user cannot cancel someone else's request. (The decision PATCH is admin-only and does not need this check.)
- Query DTOs mirror `GetGuidesQueryDto`: `page=1`, `limit=10`, `month {1-12}`, `year` — **month and year are optional and default to the current month/year**, all `@IsOptional()` with `@Type(() => Number)` coercion. Admin query adds a `status` filter (`'pending'` vs all).
- `GET /balance` returns the caller's own wallet `amount`; it is also the value the guide-creation flow checks against (see Guide-Creation Integration).

## Existing Patterns To Follow (with references)

- **Module analog:** `src/guides/guides.module.ts` (forFeature + imports UsersModule + exports service).
- **Controller shape / guards / auth extraction:** `src/guides/controllers/guides-db.controller.ts` — class `@UseGuards(JwtGuard)` (L40); admin endpoints `@UseGuards(JwtGuard, RolesGuard) @Roles('admin')` (L72-75); `@Request() req`, admin check `req.user?.role?.includes('admin')` (L93). Thin-controller rule from IMPLEMENTATION_GUIDELINES: pass `req.user` to the service, no business logic in controller.
- **User resolution:** NOT needed here — store `req.user.email` as `userEmail` directly. (Guides' `getUserId()` at `guides-db.service.ts` L599-613 exists only because guides refs `userId` as an ObjectId; balance skips it.)
- **Month/year filtering:** `buildBaseQuery()` L615-650 — `targetMonth = filters.month || now.getMonth()+1`; `targetYear = filters.year || now.getFullYear()`; `startOfMonth = new Date(year, month-1, 1)`; `endOfMonth = new Date(year, month, 0, 23,59,59,999)`. Both month and year default to current when absent. Copy verbatim for both list endpoints (swapping the `userId` scoping for `userEmail`).
- **Pagination:** `executePaginatedQuery()` L652-690 — parallel `Promise.all([find(...).sort({createdAt:-1}).skip().limit().lean(), countDocuments])`, returns `{ total, page, limit, totalPages: Math.ceil(total/limit) }` inside the envelope.
- **Resolving user name by email (admin view):** because the link is `userEmail` (a string, not an ObjectId ref), Mongoose `.populate()` does **not** apply directly. **Confirmed approach: batch lookup** (see *Resolved Decisions* for the rationale over virtual populate). Collect the page's distinct `userEmail`s, `usersModel.find({ email: { $in: emails } }, 'email name lastName')`, build an email→`"name lastName"` map, and attach `userName` when shaping each item — one extra query per page. Add a `userName` field to the admin response DTO. Full name = `name` + `lastName` (there is no `firstName`). Add `UsersService.findByEmails(emails)`.
- **Status update (approve/reject):** `updateGuideStatus()` L325-340 — `$set` then re-fetch then re-shape. For approval, use an **atomic conditional update** (see Edge Cases).
- **Soft-delete/mutate envelope + `adminId` capture:** `softDeleteGuide()` L497-533 and `addComment()` L295-320 (`$push` with `adminId`, `timestamp`).
- **Response envelope + single shaper:** `formatGuideResponse()` L988-1083; `GeneralResponse` in `src/global.interface.ts` L7-12 (`{ version, data, message, error }`); `version` from `this.configService.version` via `@Inject(config.KEY)`.
- **Response DTOs:** `src/guides/dtos/guides-db-responses.dto.ts` — `GuideResponseDto` (single), `PaginatedGuidesResponseDto` + `PaginatedGuidesDataDto` (list). Derive interface aliases from DTOs (`balance.interface.ts`) per the DTO-source-of-truth rule.
- **Error handling:** `KraftError` (`src/guides/kraft-error.ts`) — `(code, userMessage, technicalDetails?, status = BAD_REQUEST)`. New `BAL-*` codes in `balance.constants.ts` following the `GDE_<CAT>_<NNN>` → `'GDE-<CAT>-<NNN>'` convention (categories AUTH, NF, BUS, BDN). Every async service method wrapped in try/catch, re-throw `KraftError` as-is (AGENTS.md rule). The global filter (`src/exceptions/GeneralException.filter.ts`) already serializes `KraftError`.

## Guide-Creation Integration (spend balance)

Creating a guide must be gated on the user's wallet. This touches the **guides** module, not just balance.

- **Where:** `GuidesDbService.createGuide()` (`src/guides/services/guides-db.service.ts`). `GuidesModule` imports `BalanceModule`; `GuidesDbService` injects `BalanceService`.
- **Guide total (confirmed):** the amount to charge is `quote.total` — the customer-facing quote total (after profit margin) already stored on the guide (see the guides quote snapshot / `buildQuoteResponse`).
- **Confirmed sequence:**
  1. **Validate** the balance covers the total — a plain read check `amount >= total` **without** debiting; if insufficient → throw a business `KraftError` (e.g. `BAL-BUS-00x` "Saldo insuficiente") and **do not create the guide**. Gives the user a fast "insufficient balance" before any record is created.
  2. **Create** the guide (so a record always exists).
  3. **Atomic guarded debit** — debit and re-validate in a **single indivisible operation** where the condition lives in the query filter: `Balance.findOneAndUpdate({ userEmail, amount: { $gte: total } }, { $inc: { amount: -total } }, { new: true })`. A non-null result means the debit succeeded → continue. A `null` result means the balance changed in the tiny window since step 1 and is now insufficient → mark the guide rejected/insufficient-balance and **stop** (no provider call; the `$inc` never fired, so the wallet is untouched).
  4. **Call** the provider API.
  5. The debit already applied in step 3 **stays regardless of provider success or failure**.
- **Why a single atomic op (not get-then-update):** a separate read-then-write reopens a check-then-act race — two concurrent creations could both read the old amount, both pass, both write, and overdraw the wallet. Letting MongoDB evaluate `amount >= total` in the update filter fuses the check and the debit so two simultaneous debits can't both succeed past the balance. Placing this guarded debit **before** the provider call means a failed re-check rejects cleanly — **no negative wallet and no unpaid guide** — instead of leaving a guide that was labelled but couldn't be charged.
- **Failed guides hold the debit:** once step 3 succeeds, the charge is applied before the provider call and is **not** refunded on provider failure — a `failed` guide keeps its charge. **Retry must not re-debit** — the wallet was already charged at the original creation. The debit fires **exactly once** per guide (step 3), never again on retry/sync.
- **Concurrency note:** the `null` branch in step 3 will almost never fire at current volume (low traffic; a single user repeating the same operation is highly unlikely), but it is the correct fallback instead of an overdraft.
- **Truncation:** the debited `total` must be truncated to 2 decimals to stay consistent with wallet precision.

## Email Notifications

`MailService` (`src/mail/services/mail.service.ts`) currently exposes only `sendUserForgotPasswordEmail`. Pattern: instantiate `new Resend(this.configService.mail.resendApiKey)`, `from = this.configService.mail.mailerMail`, render a React Email template with `render(React.createElement(Template, props))`, then `resend.emails.send({ from, to, subject, html })`. `to` accepts a **string or array** — pass an array of admin emails for the admin notifications.

Two new templates in `emails/` + two new `MailService` methods (no cancellation email — cancellation sends no notification):

| Trigger | Recipients | Template props |
| --- | --- | --- |
| Request created | all admins | requesting user name, amount, paymentReference, date |
| Request approved / rejected | requesting user | outcome, amount, optional reason |

Templates follow `ResetPassword.tsx`: default-export function component with a typed props interface, wrapped in `<Html><Head><Tailwind><Body><Container>`, Spanish copy, "Kraft Envios" branding.

**Admin email list** — no existing query. Add `UsersService.findAdmins()` → `userModel.find({ role: 'admin' })` (matches array-contains since `role: Role[]`), map to `.email`/`.name`. For resolving requester names in the admin list, add `UsersService.findByEmails(emails: string[])` → `userModel.find({ email: { $in: emails } }, 'email name lastName')` (the batch-lookup approach above). The single-request notification can reuse the existing `findByEmail`.

## Dependencies & Integration Points

- `UsersModule` / `UsersService` — `findByEmail` (exists), plus **new** `findAdmins()` and `findByEmails(emails)`. `UsersModule` already exported (imported by guides-db the same way).
- `MailModule` / `MailService` — import into `BalanceModule`; add the three send methods.
- `GuidesModule` — imports `BalanceModule`; `GuidesDbService.createGuide()` calls `BalanceService` to check/debit the wallet. `BalanceModule` must `exports: [BalanceService]`.
- `config` (`src/config.ts`) — `version`, `mail.resendApiKey`, `mail.mailerMail`, `frontend.uri` (for any deep links in emails).
- `AuthModule` guards/decorators — `JwtGuard`, `RolesGuard`, `@Roles`.
- No new environment variables required (Resend + mailer already configured).
- `src/app.module.ts` — add `BalanceModule` to `imports`.

## Edge Cases & Constraints

- **Double-approval / race:** approval must be an atomic conditional update — `findOneAndUpdate({ _id, status: 'pending' }, { $set: { status:'approved', adminInCharge, decisionReason, decisionAt, paymentReference } }, { new: true })`. If it returns null the request was already actioned → throw a business `KraftError` (no wallet credit). This prevents crediting the wallet twice.
- **Wallet credit atomicity:** credit via `Balance.findOneAndUpdate({ userEmail }, { $inc: { amount } }, { upsert: true, new: true, setDefaultsOnInsert: true })` — mirrors the atomic counter in `generateKraftId()`.
- **Spend / debit atomicity (guide creation):** debit via conditional `findOneAndUpdate({ userEmail, amount: { $gte: total } }, { $inc: { amount: -total } })`; null → insufficient balance → business `KraftError`, no guide. See Guide-Creation Integration for provider-failure/rollback handling.
- **State guards:** approve/reject allowed only from `pending`; **cancel allowed only from `pending`** (confirmed) and only by the owner. Any other transition → business `KraftError`.
- **Ownership isolation:** users list/cancel only their own requests (filter by `userEmail` from the JWT); a non-owner must not act on a request.
- **`adminInCharge` visibility:** strip `adminInCharge` (and possibly `decisionReason`) from the user-facing response shaper; include only in the admin shaper. Consider two response DTOs or an `isAdmin` flag through the single shaper (guides passes `includeInternalPricing` similarly).
- **amount validation:** required, numeric, `> 0`, **max `100000`** per request (confirmed); reject `0`/negative/`NaN`/over-max at the DTO layer; **truncate to 2 decimals** (`19.487 → 19.48`) on write.
- **Email failure isolation (best-effort):** the DB mutation (status change, wallet credit/debit) is the source of truth and must **commit regardless of email outcome**. Concretely: perform the mutation first, then send notifications inside their own `try/catch`; on a Resend failure, **log it and continue** — do **not** throw, do **not** roll back the mutation, and still return the success envelope. A failed email therefore means the action succeeded but the notice didn't go out (acceptable; retry/alerting is a future concern). The alternative — surfacing the email error to the client — is rejected because it would misreport a committed approval/credit as failed.
- **Month/year defaults:** absent month/year → current month window (matches guides), so lists are always bounded.
- **Rejection is terminal:** rejected requests do not touch the wallet and cannot be re-actioned; the user would submit a new request.

## Resolved Decisions (previously open)

- **Amount precision** — decimal fixed to **2 decimals, truncated** (`19.487 → 19.48`). Storage-as-cents vs truncate-on-write is a plan-phase implementation choice; float-drift note documented under *amount precision*.
- **Email-failure policy** — **best-effort** (mutation commits, email failure logged, not surfaced). See *Email failure isolation* for exact semantics.
- **Cancel** — only **pending** requests are cancellable, by the owner. Approved balance is not reversible via cancel.
- **`GET /balance`** — **in scope**; it's the wallet the guide-creation flow checks and debits.
- **Decision endpoint** — **single** `PATCH .../decision { action }` route.
- **Multiple requests** — **allowed**; no open-request guard.
- **Cancel notification** — **none**. Cancelling a pending request sends **no** email (previously admins were notified). Only two email templates remain: request-created (to admins) and decision (to user).
- **Cancel ownership** — the cancel PATCH validates `req.user.email` === the request's `userEmail`; a user cannot cancel another user's request.
- **Guide debit ordering** — validate `balance >= quote.total` **without** debiting → create guide → **atomic guarded debit** (`findOneAndUpdate({ userEmail, amount: { $gte: total } }, { $inc: { amount: -total } })`) immediately **before** the provider call → call provider. A `null` guarded-debit result (balance drained by a concurrent creation in the window) rejects the guide for insufficient balance with no provider call. Once applied, the debit **stays regardless of provider success/failure**; a `failed` guide **holds** the debit and **retry does not re-charge** (debit fires exactly once). Single atomic op — not get-then-update — to avoid a check-then-act overdraft race; placed before the provider call so a failed re-check leaves neither a negative wallet nor an unpaid guide. (See *Guide-Creation Integration* for the full sequence and rationale.)
- **Guide total field** — the charge is **`quote.total`** (customer-facing total after profit margin).
- **Per-request maximum** — a single balance request `amount` is capped at **`100000`** (validated at the DTO layer).
- **Name-resolution approach (admin list)** — **batch lookup** (recommended). For each page, collect the distinct `userEmail`s and run one `usersModel.find({ email: { $in: emails } }, 'email name lastName')`, build an email→name map, and attach `userName` when shaping items. **Why over virtual populate:** the link is a plain `userEmail` string (not an ObjectId ref), so it needs no schema virtual/`ref` wiring; it's a single bounded extra query per page (page size, not result set); it keeps name resolution in the service shaper (explicit, testable) rather than coupling the entity schema to `User`; and it degrades gracefully (email with no matching user → fall back to the raw email) without populate surprises. Virtual populate works but adds schema setup and hides a per-row lookup for no gain at list scale.

## Open Questions

None remaining — all previously open questions are resolved (see *Resolved Decisions* and *Guide-Creation Integration*).

## Assumptions

- Both `Balance` and `BalanceRequest` link the user by **`userEmail: string`** (from the JWT), not an ObjectId ref. A user has **one** `Balance` (unique `userEmail`) and **many** `BalanceRequest`s.
- `Balance` and `BalanceRequest` are two separate collections; the wallet is created lazily on first approval (upsert), so users without an approved request have an implicit `0` balance.
- Request "date and time" = Mongoose `createdAt` (via `timestamps: true`); no separate date field.
- `adminInCharge` is stored as an **email string** (the acting admin), consistent with the JWT payload exposing `email` (not an id). It is `null` until the first decision.
- The admin list view's "July 2026" style timeframe = the month/year window from `buildBaseQuery`, ordered `createdAt: -1`.
- Best-effort email delivery (does not block the mutation) — see *Email failure isolation*.
- Error codes use a new `BAL-*` family following the guides `GDE-*` convention. Changes to existing modules: `UsersService` helper additions (`findAdmins`, `findByEmails`), `GuidesModule`/`GuidesDbService` for the balance check-and-debit at guide creation, and `app.module.ts` registration.

## Post-Research Decisions (made during planning)

These decisions were confirmed with the stakeholder after research and supersede the corresponding items above where they conflict. See [`ai-planning/planning-balance-feature.md`](../ai-planning/planning-balance-feature.md).

1. **Denormalize requester name onto `BalanceRequest`.** On `POST /balance/requests`, store `userName` and `userLastName` (both **separate** fields) directly from the JWT payload (`PayloadToken` already carries `email`, `name`, `lastName`, `role`), alongside `userEmail`. They are a point-in-time snapshot captured at creation and are not updated on later profile changes.
   - **Consequence:** the admin list and decision responses read the display name (`userName + ' ' + userLastName`) straight from the stored request. The researched **batch lookup `UsersService.findByEmails`** and its missing-user email fallback are **no longer needed and are dropped**. Only `UsersService.findAdmins()` is added (for the request-created admin notification). No auth/token change is required.

2. **`insufficient`-marked failed guides are retryable.** The research/first plan treated an insufficient-balance guide-creation failure as terminal for retry. Revised: a guide that failed with `balanceChargeStatus: 'insufficient'` (wallet drained at the guarded-debit step, or under-funded) **can be retried**. Retry re-runs `assertSufficientBalance` + the guarded debit transaction before the provider call, so a user who tops up their wallet can retry the same failed guide, which then debits **for the first time** and calls the provider. If the wallet is still short, the guide stays `failed`/`insufficient`. The debit still fires **at most once** per guide.
   - Retry matrix by internal `balanceChargeStatus`: `debited` → retry with no re-debit; `insufficient` → retry re-checks + may debit once; `pending`/`bypassed` → not retryable; legacy `undefined` → existing pre-balance behavior.

3. **Guide failure reason storage.** The reason a balance-gated guide failed reuses the **existing** `Guide.failureInfo` field (`errorDetails` = human-readable reason, `errorCode` = shared insufficient-funds constant). No new reason field is added.

4. **Internal charge-marker fields live on the `Guide` entity.** `balanceChargeStatus`, `balanceDebitAmountInCents`, and `balanceDebitedAt` are internal optional fields on `src/guides/entities/guide.entity.ts` (not a new collection, not a new `status` enum member, and excluded from public guide response DTOs).

5. **Scaffold via the Nest CLI.** Per `.github/IMPLEMENTATION_GUIDELINES.md`, the module/service/controller are generated with `nest g mo balance`, `nest g s balance/balance`, `nest g co balance/balance` (which also registers `BalanceModule` in `AppModule`), rather than hand-created. Entities, DTOs, constants, utils, interfaces, and email templates remain hand-authored.

6. **Money stored as integer cents.** Wallet/request values persist as `amountInCents` internally and convert to decimal `amount` only at the API/email boundary, replacing the research's truncate-on-write-with-normalization option (safer against float `$inc` drift).

7. **Insufficient funds creates a `failed` guide (no provider call).** This **supersedes** AC6's "validate the balance *before* creating anything." The persisted guide is now always created first; if the balance is insufficient (either the pre-debit read or the atomic guarded `$inc` returning `null`), the guide is marked `status: 'failed'` + `balanceChargeStatus: 'insufficient'` with a balance `failureInfo` reason, **the provider is never called, and the wallet is unchanged**. The failed guide is a persisted, retryable record — which is what makes decision #2 (retry when funded) meaningful for the common case, not just the rare concurrency race.

8. **Admin-only debit bypass flag.** A new `?bypassBalance=true` query flag on `POST /guides/db/create` lets an **admin** create a **real** (provider-called) guide with **no** balance check and **no** debit, persisted as `balanceChargeStatus: 'admin_bypassed'` (retryable without debit). The service enforces the admin check from the JWT role; a non-admin supplying the flag is rejected before anything is created. This is distinct from `?mock=`, which still bypasses the wallet and calls only the mock provider; if both are supplied, `mock` wins. The internal `balanceChargeStatus` enum therefore becomes `'pending' | 'debited' | 'insufficient' | 'bypassed' | 'admin_bypassed'`.
