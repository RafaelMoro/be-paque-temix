# Balance Feature Research

## Overview

Add a user **Balance** (a per-user wallet) that grows through admin-validated **Balance Requests**. A user creates a request to add funds (after depositing money externally); admins are notified by email, verify the transaction out-of-band, and approve or reject it. On approval the user's wallet is credited and the user is notified by email. Users can cancel their own pending requests (admins notified), and both users and admins can browse requests by month/year. The wallet is **spent when a guide is created**: guide creation must verify the user's balance covers the guide total and debit it.

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
3. A user can cancel **their own pending** request; status becomes `cancelled` and **admins are notified by email**. Requests that are not `pending` cannot be cancelled.
4. A user can list **their own** requests filtered by month/year (both **optional**, defaulting to the current month/year) and see each request's status; a user never sees `adminInCharge`.
5. An admin can list requests filtered by month/year (optional, default current), filter by **pending-only or all** statuses, with each request showing the requesting user's **name** resolved from `userEmail`.
6. Creating a guide **validates the user's balance covers the guide total** and **debits** the wallet atomically on success; if the balance is insufficient, guide creation is rejected with a business error and the wallet is unchanged.

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
| `POST /balance/requests` | user | `{ amount, paymentReference? }` | Create pending request; email all admins |
| `GET /balance/requests` | user | `?month&year&page&limit` | List **own** requests by month/year |
| `GET /balance/requests/admin` | admin | `?month&year&status&page&limit` | List all requests, populated userId→name; `status` filters pending-only vs all |
| `PATCH /balance/requests/:id/decision` | admin | `{ action: 'approve' \| 'reject', reason?, paymentReference? }` | Approve (credits wallet) or reject; email user |
| `PATCH /balance/requests/:id/cancel` | user | — | Cancel own pending request; email admins |
| `GET /balance` | user | — | Read own current wallet `amount` (also checked at guide creation) |

Notes:
- Identify the caller by `req.user.email` (there is **no** `userId`/`sub` on the JWT payload) and store/query `userEmail` **directly** — no ObjectId resolution step. This is simpler than the guides `getUserId()` pattern, which only exists because guides stores `userId` as an ObjectId ref.
- Admin check inline: `req.user?.role?.includes('admin') ?? false`.
- Admin decision endpoint uses **one** PATCH with an `action: 'approve' | 'reject'` discriminator (confirmed — single route, not split). Keeps reason/paymentReference handling in one place.
- Query DTOs mirror `GetGuidesQueryDto`: `page=1`, `limit=10`, `month {1-12}`, `year` — **month and year are optional and default to the current month/year**, all `@IsOptional()` with `@Type(() => Number)` coercion. Admin query adds a `status` filter (`'pending'` vs all).
- `GET /balance` returns the caller's own wallet `amount`; it is also the value the guide-creation flow checks against (see Guide-Creation Integration).

## Existing Patterns To Follow (with references)

- **Module analog:** `src/guides/guides.module.ts` (forFeature + imports UsersModule + exports service).
- **Controller shape / guards / auth extraction:** `src/guides/controllers/guides-db.controller.ts` — class `@UseGuards(JwtGuard)` (L40); admin endpoints `@UseGuards(JwtGuard, RolesGuard) @Roles('admin')` (L72-75); `@Request() req`, admin check `req.user?.role?.includes('admin')` (L93). Thin-controller rule from IMPLEMENTATION_GUIDELINES: pass `req.user` to the service, no business logic in controller.
- **User resolution:** NOT needed here — store `req.user.email` as `userEmail` directly. (Guides' `getUserId()` at `guides-db.service.ts` L599-613 exists only because guides refs `userId` as an ObjectId; balance skips it.)
- **Month/year filtering:** `buildBaseQuery()` L615-650 — `targetMonth = filters.month || now.getMonth()+1`; `targetYear = filters.year || now.getFullYear()`; `startOfMonth = new Date(year, month-1, 1)`; `endOfMonth = new Date(year, month, 0, 23,59,59,999)`. Both month and year default to current when absent. Copy verbatim for both list endpoints (swapping the `userId` scoping for `userEmail`).
- **Pagination:** `executePaginatedQuery()` L652-690 — parallel `Promise.all([find(...).sort({createdAt:-1}).skip().limit().lean(), countDocuments])`, returns `{ total, page, limit, totalPages: Math.ceil(total/limit) }` inside the envelope.
- **Resolving user name by email (admin view):** because the link is `userEmail` (a string, not an ObjectId ref), Mongoose `.populate()` does **not** apply directly. Resolve names by looking up the users collection by email. Two viable approaches (decide at plan time):
  - **Batch lookup (recommended for lists):** collect the page's distinct `userEmail`s, `usersModel.find({ email: { $in: emails } }, 'email name lastName')`, build an email→`"name lastName"` map, and attach `userName` when shaping each item. One extra query per page.
  - **Virtual populate:** define a Mongoose virtual with `ref: 'User'`, `localField: 'userEmail'`, `foreignField: 'email'`, `justOne: true`, then `.populate('user', 'name lastName')`. More setup; keeps it in the query.
  - Either way add a `userName` field to the admin response DTO. Full name = `name` + `lastName` (there is no `firstName`). Add `UsersService.findByEmails(emails)` (or reuse `findByEmail` in a loop for the single-item case).
- **Status update (approve/reject):** `updateGuideStatus()` L325-340 — `$set` then re-fetch then re-shape. For approval, use an **atomic conditional update** (see Edge Cases).
- **Soft-delete/mutate envelope + `adminId` capture:** `softDeleteGuide()` L497-533 and `addComment()` L295-320 (`$push` with `adminId`, `timestamp`).
- **Response envelope + single shaper:** `formatGuideResponse()` L988-1083; `GeneralResponse` in `src/global.interface.ts` L7-12 (`{ version, data, message, error }`); `version` from `this.configService.version` via `@Inject(config.KEY)`.
- **Response DTOs:** `src/guides/dtos/guides-db-responses.dto.ts` — `GuideResponseDto` (single), `PaginatedGuidesResponseDto` + `PaginatedGuidesDataDto` (list). Derive interface aliases from DTOs (`balance.interface.ts`) per the DTO-source-of-truth rule.
- **Error handling:** `KraftError` (`src/guides/kraft-error.ts`) — `(code, userMessage, technicalDetails?, status = BAD_REQUEST)`. New `BAL-*` codes in `balance.constants.ts` following the `GDE_<CAT>_<NNN>` → `'GDE-<CAT>-<NNN>'` convention (categories AUTH, NF, BUS, BDN). Every async service method wrapped in try/catch, re-throw `KraftError` as-is (AGENTS.md rule). The global filter (`src/exceptions/GeneralException.filter.ts`) already serializes `KraftError`.

## Guide-Creation Integration (spend balance)

Creating a guide must be gated on the user's wallet. This touches the **guides** module, not just balance.

- **Where:** `GuidesDbService.createGuide()` (`src/guides/services/guides-db.service.ts`). `GuidesModule` imports `BalanceModule`; `GuidesDbService` injects `BalanceService`.
- **Guide total:** the amount to charge is the guide's quote total — the `quote.total` already stored on the guide (see the guides quote snapshot / `buildQuoteResponse`). Confirm the exact field at plan time (the customer-facing total after profit margin).
- **Atomic check-and-debit:** debit with a single conditional update that both verifies sufficiency and decrements, avoiding a check-then-act race / overdraft:
  `Balance.findOneAndUpdate({ userEmail, amount: { $gte: total } }, { $inc: { amount: -total } }, { new: true })`.
  If it returns `null`, the balance is insufficient → throw a business `KraftError` (e.g. `BAL-BUS-00x` "Saldo insuficiente") and **do not create the guide**.
- **Ordering / rollback:** decide the sequence at plan time — debit before the external provider call vs after. Key edge case: if the provider call **fails** after debiting, either (a) debit only on provider success, or (b) debit up-front and **refund** (`$inc: +total`) on failure. Since guides persist even on provider failure (status `failed`) and support retry, the plan must define whether a `failed` guide holds the debit or is refunded. **Open question — see below.**
- **Truncation:** the debited `total` must be truncated to 2 decimals to stay consistent with wallet precision.

## Email Notifications

`MailService` (`src/mail/services/mail.service.ts`) currently exposes only `sendUserForgotPasswordEmail`. Pattern: instantiate `new Resend(this.configService.mail.resendApiKey)`, `from = this.configService.mail.mailerMail`, render a React Email template with `render(React.createElement(Template, props))`, then `resend.emails.send({ from, to, subject, html })`. `to` accepts a **string or array** — pass an array of admin emails for the admin notifications.

Three new templates in `emails/` + three new `MailService` methods:

| Trigger | Recipients | Template props |
| --- | --- | --- |
| Request created | all admins | requesting user name, amount, paymentReference, date |
| Request approved / rejected | requesting user | outcome, amount, optional reason |
| Request cancelled | all admins | user name, amount |

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
- **amount validation:** required, numeric, `> 0`; reject `0`/negative/`NaN` at the DTO layer; **truncate to 2 decimals** (`19.487 → 19.48`) on write. Decide on a per-request max at plan time.
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

## Open Questions

1. **Guide debit ordering / refund on provider failure** — guides persist even when the provider call fails (status `failed`) and support retry. Does a `failed` guide **hold** the debit (so retry doesn't re-charge) or should the debit be **refunded** on provider failure and re-applied on a successful retry? This changes where the `$inc` sits relative to the provider call. (Recommendation: debit only on provider success, so `failed` guides carry no charge; needs confirmation.)
2. **Guide total field** — confirm the exact stored field used as the charge (customer-facing `quote.total` after profit margin) so the debit matches what the user was shown.
3. **Per-request maximum** `amount` — is there an upper bound on a single balance request?
4. **Name-resolution approach** — batch lookup vs Mongoose virtual populate (both viable; batch recommended for lists).

## Assumptions

- Both `Balance` and `BalanceRequest` link the user by **`userEmail: string`** (from the JWT), not an ObjectId ref. A user has **one** `Balance` (unique `userEmail`) and **many** `BalanceRequest`s.
- `Balance` and `BalanceRequest` are two separate collections; the wallet is created lazily on first approval (upsert), so users without an approved request have an implicit `0` balance.
- Request "date and time" = Mongoose `createdAt` (via `timestamps: true`); no separate date field.
- `adminInCharge` is stored as an **email string** (the acting admin), consistent with the JWT payload exposing `email` (not an id). It is `null` until the first decision.
- The admin list view's "July 2026" style timeframe = the month/year window from `buildBaseQuery`, ordered `createdAt: -1`.
- Best-effort email delivery (does not block the mutation) — see *Email failure isolation*.
- Error codes use a new `BAL-*` family following the guides `GDE-*` convention. Changes to existing modules: `UsersService` helper additions (`findAdmins`, `findByEmails`), `GuidesModule`/`GuidesDbService` for the balance check-and-debit at guide creation, and `app.module.ts` registration.
