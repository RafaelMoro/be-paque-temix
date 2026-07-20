# Balance Feature Research

## Overview

Add a user **Balance** (a per-user wallet) that grows through admin-validated **Balance Requests**. A user creates a request to add funds (after depositing money externally); admins are notified by email, verify the transaction out-of-band, and approve or reject it. On approval the user's wallet is credited and the user is notified by email. Users can cancel their own pending requests (admins notified), and both users and admins can browse requests by month/year.

This feature mirrors the existing **guides-db** module, which is the closest analog (per-user ownership, admin vs user views, month/year filtering, status lifecycle, `KraftError` handling, response envelopes). Reuse its patterns rather than inventing new ones.

## Confirmed Decisions (from stakeholder)

1. **Balance model** — Persistent per-user wallet `Balance { userId, amount }`. Approving a request atomically adds the request `amount` to the user's `Balance`.
2. **Admin routing** — *Claimed at approval*. No pre-assignment and no new field on `User`. On create, **all** admins are emailed; `adminInCharge` is empty until an admin approves/rejects, at which point it records the acting admin's email.
3. **Decision flow** — Admin can **approve or reject** a pending request; a `reason` is **optional** on both and is included in the user notification email.
4. **Request payload** — `amount` (required) plus an **optional** `paymentReference` (transfer reference / concept text) the admin uses to match the deposit. No receipt upload in scope.
5. **Approval payload** — the admin also passes a `paymentReference` string on approval to record/confirm the verified reference on the request (in addition to the optional `reason`).

## Acceptance Criteria

1. A user can `POST` a balance request with `{ amount, paymentReference? }`; it is persisted with `status: 'pending'`, `adminInCharge: null`, owned by the caller, and **all admins receive a notification email**.
2. An admin can approve or reject a pending request with an optional reason; approval **atomically credits the user's `Balance.amount`** and records `adminInCharge`, and the **requesting user is notified by email** of the outcome. Rejection changes status only (no wallet change).
3. A user can cancel **their own pending** request; status becomes `cancelled` and **admins are notified by email**. Requests that are not `pending` cannot be cancelled.
4. A user can list **their own** requests filtered by month/year and see each request's status; a user never sees `adminInCharge`.
5. An admin can list requests filtered by month/year, filter by **pending-only or all** statuses, with each request **populated with the requesting user's name** (userId → name).

## Scope

Single feature, best delivered as one story with clear phases (entities → service/CRUD + wallet crediting → controller/guards → email templates + notifications). Sized comparably to a subset of guides-db. Not an epic.

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

**Module wiring** (`balance.module.ts`): `MongooseModule.forFeature([Balance, BalanceRequest])`; `imports: [UsersModule, MailModule]`; `providers: [BalanceService]`; `controllers: [BalanceController]`. (`UsersModule` already exports `UsersService`; `MailModule` already exports `MailService`.)

## Data Shapes

### `Balance` entity (persistent wallet)
- `@Schema({ timestamps: true, collection: 'balances' })`
- `userId: Types.ObjectId` — `ref: 'User'`, **unique**, indexed (one wallet per user)
- `amount: number` — default `0`
- Created lazily on first approval via upsert.

### `BalanceRequest` entity
- `@Schema({ timestamps: true, collection: 'balance_requests' })` → `createdAt` is the request "date and time"; `updatedAt` auto.
- `userId: Types.ObjectId` — `ref: 'User'`, required, indexed (owner)
- `amount: number` — required, must be `> 0` (validate in DTO)
- `paymentReference?: string` — optional; supplied by the **user at creation** (the transfer reference/concept they used) and/or **confirmed/overwritten by the admin at approval**. The approval payload includes `paymentReference` so the admin records the verified reference on the request.
- `status: 'pending' | 'approved' | 'rejected' | 'cancelled'` — enum, default `'pending'`, indexed
- `adminInCharge?: string` — admin **email** (set on approve/reject); admin-only visibility
- `decisionReason?: string` — optional reason captured at approve/reject
- `decisionAt?: Date` — timestamp of approve/reject
- Compound indexes to mirror guides: `{ userId, createdAt: -1 }`, `{ status, createdAt: -1 }`, `{ createdAt: -1 }`.
- `export type BalanceRequestDoc = BalanceRequest;` (DTO/entity-derivation rule).

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
| `GET /balance` | user | — | (Optional) read own current wallet `amount` |

Notes:
- Identify the caller by `req.user.email` (there is **no** `userId`/`sub` on the JWT payload). Resolve to a Mongo `ObjectId` via the `getUserId()` pattern (email → `UsersService.findByEmail` → `_id`).
- Admin check inline: `req.user?.role?.includes('admin') ?? false`.
- Admin decision endpoint uses one PATCH with an `action` discriminator rather than separate approve/reject routes (keeps the reason handling in one place). Split into two routes if preferred at plan time.
- Query DTOs mirror `GetGuidesQueryDto`: `page=1`, `limit=10`, `month {1-12}`, `year`, all `@IsOptional()` with `@Type(() => Number)` coercion. Admin query adds a `status` filter (`'pending'` vs all).

## Existing Patterns To Follow (with references)

- **Module analog:** `src/guides/guides.module.ts` (forFeature + imports UsersModule + exports service).
- **Controller shape / guards / auth extraction:** `src/guides/controllers/guides-db.controller.ts` — class `@UseGuards(JwtGuard)` (L40); admin endpoints `@UseGuards(JwtGuard, RolesGuard) @Roles('admin')` (L72-75); `@Request() req`, admin check `req.user?.role?.includes('admin')` (L93). Thin-controller rule from IMPLEMENTATION_GUIDELINES: pass `req.user` to the service, no business logic in controller.
- **User resolution:** `getUserId()` in `src/guides/services/guides-db.service.ts` L599-613 (email → `findByEmail` → `_id`, throws `KraftError(GDE_AUTH_001)` if missing). Replicate as a private helper.
- **Month/year filtering:** `buildBaseQuery()` L615-650 — `targetMonth = filters.month || now.getMonth()+1`; `startOfMonth = new Date(year, month-1, 1)`; `endOfMonth = new Date(year, month, 0, 23,59,59,999)`; defaults to current month when absent. Copy verbatim for both list endpoints.
- **Pagination:** `executePaginatedQuery()` L652-690 — parallel `Promise.all([find(...).sort({createdAt:-1}).skip().limit().populate(...).lean(), countDocuments])`, returns `{ total, page, limit, totalPages: Math.ceil(total/limit) }` inside the envelope.
- **userId → name population (admin view):** the closest existing pattern is the `deletedBy` populate — `.populate('deletedBy', 'name lastName')` (L667) flattened by `resolveDeletedByName()` (L1110-1120). For balance, use `.populate('userId', 'name lastName')` + a symmetric `resolveUserName()` and add a `userName` field to the admin response DTO. Full name = `name` + `lastName` (there is no `firstName`).
- **Status update (approve/reject):** `updateGuideStatus()` L325-340 — `$set` then re-fetch then re-shape. For approval, use an **atomic conditional update** (see Edge Cases).
- **Soft-delete/mutate envelope + `adminId` capture:** `softDeleteGuide()` L497-533 and `addComment()` L295-320 (`$push` with `adminId`, `timestamp`).
- **Response envelope + single shaper:** `formatGuideResponse()` L988-1083; `GeneralResponse` in `src/global.interface.ts` L7-12 (`{ version, data, message, error }`); `version` from `this.configService.version` via `@Inject(config.KEY)`.
- **Response DTOs:** `src/guides/dtos/guides-db-responses.dto.ts` — `GuideResponseDto` (single), `PaginatedGuidesResponseDto` + `PaginatedGuidesDataDto` (list). Derive interface aliases from DTOs (`balance.interface.ts`) per the DTO-source-of-truth rule.
- **Error handling:** `KraftError` (`src/guides/kraft-error.ts`) — `(code, userMessage, technicalDetails?, status = BAD_REQUEST)`. New `BAL-*` codes in `balance.constants.ts` following the `GDE_<CAT>_<NNN>` → `'GDE-<CAT>-<NNN>'` convention (categories AUTH, NF, BUS, BDN). Every async service method wrapped in try/catch, re-throw `KraftError` as-is (AGENTS.md rule). The global filter (`src/exceptions/GeneralException.filter.ts`) already serializes `KraftError`.

## Email Notifications

`MailService` (`src/mail/services/mail.service.ts`) currently exposes only `sendUserForgotPasswordEmail`. Pattern: instantiate `new Resend(this.configService.mail.resendApiKey)`, `from = this.configService.mail.mailerMail`, render a React Email template with `render(React.createElement(Template, props))`, then `resend.emails.send({ from, to, subject, html })`. `to` accepts a **string or array** — pass an array of admin emails for the admin notifications.

Three new templates in `emails/` + three new `MailService` methods:

| Trigger | Recipients | Template props |
| --- | --- | --- |
| Request created | all admins | requesting user name, amount, paymentReference, date |
| Request approved / rejected | requesting user | outcome, amount, optional reason |
| Request cancelled | all admins | user name, amount |

Templates follow `ResetPassword.tsx`: default-export function component with a typed props interface, wrapped in `<Html><Head><Tailwind><Body><Container>`, Spanish copy, "Kraft Envios" branding.

**Admin email list** — no existing query. Add `UsersService.findAdmins()` → `userModel.find({ role: 'admin' })` (matches array-contains since `role: Role[]`), map to `.email`/`.name`. Also add a `findById` helper (none exists today) if the service needs the requester's name without re-populating.

## Dependencies & Integration Points

- `UsersModule` / `UsersService` — `findByEmail` (exists), plus **new** `findAdmins()` and possibly `findById()`. `UsersModule` already exported (imported by guides-db the same way).
- `MailModule` / `MailService` — import into `BalanceModule`; add the three send methods.
- `config` (`src/config.ts`) — `version`, `mail.resendApiKey`, `mail.mailerMail`, `frontend.uri` (for any deep links in emails).
- `AuthModule` guards/decorators — `JwtGuard`, `RolesGuard`, `@Roles`.
- No new environment variables required (Resend + mailer already configured).
- `src/app.module.ts` — add `BalanceModule` to `imports`.

## Edge Cases & Constraints

- **Double-approval / race:** approval must be an atomic conditional update — `findOneAndUpdate({ _id, status: 'pending' }, { $set: { status:'approved', adminInCharge, decisionReason, decisionAt, paymentReference } }, { new: true })`. If it returns null the request was already actioned → throw a business `KraftError` (no wallet credit). This prevents crediting the wallet twice.
- **Wallet credit atomicity:** credit via `Balance.findOneAndUpdate({ userId }, { $inc: { amount } }, { upsert: true, new: true, setDefaultsOnInsert: true })` — mirrors the atomic counter in `generateKraftId()`.
- **State guards:** approve/reject allowed only from `pending`; cancel allowed only from `pending` (and only by the owner). Any other transition → business `KraftError`.
- **Ownership isolation:** users list/cancel only their own requests (filter by resolved `userId`); a non-owner or wrong-user id must not act on a request.
- **`adminInCharge` visibility:** strip `adminInCharge` (and possibly `decisionReason`) from the user-facing response shaper; include only in the admin shaper. Consider two response DTOs or a `isAdmin` flag through the single shaper (guides passes `includeInternalPricing` similarly).
- **amount validation:** required, numeric, `> 0`; reject `0`/negative/`NaN` at the DTO layer. Decide on a max and decimal precision (currency) at plan time.
- **Email failure isolation:** a failing notification should not roll back an already-committed status change / wallet credit. Wrap email sends so the core mutation succeeds even if Resend fails (log the failure). Confirm this policy (see Open Questions).
- **Month/year defaults:** absent month/year → current month window (matches guides), so lists are always bounded.
- **Rejection is terminal:** rejected requests do not touch the wallet and cannot be re-actioned; the user would submit a new request.

## Open Questions

1. **Currency / precision** for `amount` — integer minor units (cents) vs decimal? Any max per request? (Affects DTO validation and wallet math.)
2. **Email-failure policy** — is best-effort (mutation succeeds, email logged on failure) acceptable, or must a failed admin/user email surface as an error? Recommendation: best-effort.
3. **Cancel-after-approval** — confirmed out of scope? (Only pending is cancellable; approved funds are not reversible here.)
4. **`GET /balance`** wallet-read endpoint — in scope for this story, or does the wallet stay internal until a future "spend balance" feature? (Story works either way.)
5. **Admin decision endpoint shape** — single `PATCH .../decision { action }` (recommended) vs two routes `/approve` and `/reject`?
6. **Duplicate/open-request guard** — should a user be blocked from having multiple simultaneous pending requests, or is that allowed (like concurrent guides)? Recommendation: allow.

## Assumptions

- `Balance` and `BalanceRequest` are two separate collections; the wallet is created lazily on first approval (upsert), so users without an approved request have an implicit `0` balance.
- Request "date and time" = Mongoose `createdAt` (via `timestamps: true`); no separate date field.
- `adminInCharge` is stored as an **email string** (the acting admin), consistent with the JWT payload exposing `email` (not an id). It is `null` until the first decision.
- The admin list view's "July 2026" style timeframe = the month/year window from `buildBaseQuery`, ordered `createdAt: -1`.
- Best-effort email delivery (does not block the mutation) unless stated otherwise.
- Error codes use a new `BAL-*` family following the guides `GDE-*` convention; no changes to existing modules beyond `UsersService` helper additions and `app.module.ts` registration.
