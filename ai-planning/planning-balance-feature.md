# Plan - User Balance and Balance Requests

**Story:** Add a per-user wallet funded through admin-approved balance requests, then spend the wallet during persisted guide creation.
**Research doc:** [`ai-research/balance-feature-research.md`](../ai-research/balance-feature-research.md)
**Status:** Awaiting sign-off

---

## Scope Discipline

### In Scope

- Create the singular `balance` NestJS module, two MongoDB entities, API DTOs, response envelopes, service, controller, and unit tests (AC 1-5; repo convention).
- Create/read a user's implicit-zero wallet and create/list/cancel balance requests by authenticated email (AC 1, 3, 4).
- Let admins list requests and atomically approve or reject a pending request; approval credits the wallet exactly once (AC 2, 5).
- Add two best-effort email notifications: request-created to all admins and decision outcome to the requesting user (AC 1, 2).
- Require an admin-supplied payment reference on approval; expose `decisionReason` to the request owner while hiding `adminInCharge` from all user responses (user-confirmed planning decisions).
- Gate only `POST /guides/db/create` on the wallet, except that existing `?mock=success|failed` requests bypass both balance validation and debit (AC 6 plus user-confirmed planning decisions).
- Require a finite, positive `quote.total` for persisted guide creation and truncate it to two decimal places before checking/debiting (direct prerequisite of AC 6).
- Update repository architecture documentation for the new module and dependency edge (repo convention).

### Out of Scope

- Balance-gating direct provider creation routes under `/ge`, `/tone`, `/pkk`, or `/mn` (user-confirmed).
- Charging, refunding, or reconciling balance during `PATCH /guides/db/:guideId` (`updateGuideData`) (user-confirmed by selecting DB-create-only scope).
- Debiting mock guide creation requests (user-confirmed).
- Receipt/file uploads, request pre-assignment, admin assignment fields on `User`, refunds, reversals, notification retry queues, and frontend work (research scope).
- Refunding a debit after provider failure; a provider-failed guide keeps its original charge (AC 6).
- Re-charging an already-`debited` guide on retry, and charging legacy marker-less guides on retry; those paths never invoke wallet debit (AC 6). **Exception (user callout):** retrying an `insufficient`-marked guide *does* run the balance check and guarded debit — that is the guide's first successful charge, not a double charge.
- Migrating existing guides or users. The balance collections are new, and users without a wallet document read as zero.
- Unrelated lint cleanup, the known JWT guard test failure, and unrelated environment/configuration corrections.

---

## Acceptance-Criteria Traceability

| Acceptance criterion | Planned phases |
| --- | --- |
| AC 1 - create pending request and notify all admins | Phases 1-4 |
| AC 2 - admin decision, atomic approval credit, notify user | Phases 1-4 |
| AC 3 - owner-only pending cancellation, no email | Phases 1, 3, 4 |
| AC 4 - user month/year list, status visibility, no `adminInCharge` | Phases 1, 3, 4 |
| AC 5 - admin month/year/status list with resolved user name | Phases 1, 3, 4 |
| AC 6 - precheck, provisional guide, guarded debit, provider call, retained debit, no re-charge on retry (except first-time debit for `insufficient` retries) | Phase 5 |

---

## Technical Decisions

### Internal Money Representation

Store wallet and request values as integer cents in MongoDB (`amountInCents`), while API DTOs and email props continue to use decimal currency values named `amount`. Add one shared conversion utility:

- `toMoneyCents(value: number): number` validates a finite positive input, normalizes the canonical decimal string (including exponent notation), truncates/pads it to two fractional digits, converts it to cents, and requires a safe integer. This makes `1.15` exactly `115` cents and `19.487` exactly `1948` cents without binary multiplication drift.
- `fromMoneyCents(value: number): number` returns the API amount (`value / 100`).
- All wallet filters and `$inc` operations use cents, making repeated credits/debits exact and eliminating double drift.
- `BalanceRequest.amountInCents` is immutable after creation; the response shaper converts it back to `amount`.
- Reject values that truncate below one cent and values whose converted cents are not safe integers; never allow a zero debit or unsafe MongoDB number.

This implements the research's plan-phase storage choice without periodic normalization.

### Approval Atomicity

Use `Connection.transaction()` for approval so the conditional pending-to-approved request update and wallet upsert/credit commit or roll back together. The transaction callback must:

1. Conditionally update `{ _id, status: 'pending' }`, recording `adminInCharge`, `decisionReason`, `decisionAt`, and the required verified `paymentReference`.
2. Fail with a business `KraftError` when the conditional update returns `null`.
3. Upsert the wallet and `$inc` `amountInCents` within the same session.

Rejection needs only the atomic conditional request update because it does not touch the wallet. Notifications happen after committed database work and outside the transaction.

### Guide Debit State

**Where these markers live:** `balanceChargeStatus`, `balanceDebitAmountInCents`, and `balanceDebitedAt` are new **internal, optional** fields added to the existing `Guide` entity (`src/guides/entities/guide.entity.ts`) in Phase 5 — not a separate collection and not a new enum member of `status`. The human-readable reason a guide failed is captured in the **existing** `failureInfo.errorDetails`/`failureInfo.errorCode` fields already on `Guide`; the balance path populates them, so no redundant reason field is added.

Use existing guide states instead of adding a new `status` enum value:

- Persist the provisional guide with `status: 'waiting'` and `balanceChargeStatus: 'pending'` after the initial balance check; mock guides use `balanceChargeStatus: 'bypassed'`.
- Commit the guarded wallet debit and guide charge marker (`balanceChargeStatus: 'debited'`, charged cents, debit timestamp) in one MongoDB transaction immediately before the provider call. A process interruption can therefore leave neither a debit-only nor marker-only state.
- If guarded debit returns `null`, abort the transaction, update the guide to `status: 'failed'` plus `balanceChargeStatus: 'insufficient'`, set the shared balance insufficient-funds `failureInfo.errorCode`, and set `failureInfo.errorDetails` to the human-readable insufficient-funds reason, then throw the same business error without calling the provider.
- Provider success/failure finalizes the provisional guide as `created`/`failed` using the existing provider result mapping.

**Retry eligibility (revised per user callout).** A guide is retry-eligible only when `status === 'failed'`, and the `balanceChargeStatus` marker then decides *how* retry behaves:

| `balanceChargeStatus` | Retryable? | Retry behavior |
| --- | --- | --- |
| `debited` | Yes | Provider retry only — **never** re-debits (wallet already charged once). |
| `insufficient` | **Yes (new)** | Re-runs the balance check + guarded debit before the provider call, because the user may have topped up their wallet since the failure. This is the guide's **first** debit, not a re-charge. If the wallet is still short, the guide stays `failed`/`insufficient`. |
| `pending` | No | Provisional guide mid-flight; never reached a terminal decision. |
| `bypassed` | No | Mock guide; wallet was never involved. |
| `undefined` (legacy) | Yes | Existing pre-balance retry behavior; never debits. |

"Explicitly reject `pending` and `bypassed`" means `checkRetryEligibility` returns ineligible for those two markers so a provisional (`pending`) or mock (`bypassed`) guide can never be retried into a provider call. `insufficient` is **no longer** rejected — it is the one marker whose retry re-checks the wallet and can debit for the first time.

The markers are internal and must not be added to public guide response DTOs.

---

## Phases

### Phase 1 - Domain Contracts and Persistence

**Goal:** Establish canonical statuses, money conversion, persistence schemas, API contracts, and DTO-derived aliases before service behavior.

#### Scaffolding (use the Nest CLI, per IMPLEMENTATION_GUIDELINES)

Generate the module skeleton with the Nest CLI **before** hand-authoring the files below, so the module/provider/controller wiring and `AppModule` import are created idiomatically rather than by manual edits:

- `nest g mo balance` — creates `src/balance/balance.module.ts` and registers `BalanceModule` in `src/app.module.ts` (satisfies the Phase 4 root-registration step; verify the import instead of adding it by hand).
- `nest g s balance/balance` — creates `src/balance/services/balance.service.ts` (+ spec) and adds it to `providers` (fleshed out in Phase 3).
- `nest g co balance/balance` — creates `src/balance/controllers/balance.controller.ts` (+ spec) and adds it to `controllers` (fleshed out in Phase 4).

Then hand-author entities, DTOs, constants, utils, interfaces, and email templates (the CLI does not scaffold these). Move/rename any generated spec files to match the co-located `.spec.ts` convention if the CLI places them elsewhere.

#### Changes Required

**`src/balance/balance.constants.ts` - Create**

- Define `BALANCE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const`, its derived status type, and admin-list filter values (`pending`, `all`).
- Define `BAL-*` codes and Spanish/user-facing messages for authentication, request not found, ownership violation, invalid state transition, insufficient funds, invalid amount, and database/transaction failures.
- Assign appropriate `KraftError` HTTP statuses at throw sites: unauthenticated/forbidden, not found, and bad-request/conflict business transitions rather than allowing raw 500 responses.
- Reserve one insufficient-funds constant for both the balance service and guide `failureInfo` so retry can identify the non-charged race outcome without string literals.
- Define request maximum `100000` in one place for DTO documentation and service assertions.
- Define `MAX_SAFE_MONEY_CENTS = Number.MAX_SAFE_INTEGER` for wallet schema/update guards.

**`src/balance/balance.utils.ts` - Create**

- Add `toMoneyCents(value: number): number` and `fromMoneyCents(value: number): number`.
- Reject non-finite/non-positive values, converted values below one cent, and non-safe-integer cents at the service boundary even though request DTO validation catches normal HTTP input; guide integration calls the service directly.
- Preserve the confirmed truncation behavior at the `0.01`, `1.15`, `19.487`, exponent-notation, and `100000` boundaries.

**`src/balance/balance.utils.spec.ts` - Create**

- Cover truncation rather than rounding, binary-sensitive exact values such as `1.15`, exponent notation, sub-cent rejection, maximum amount conversion, unsafe-integer rejection, and invalid finite/positive inputs.

**`src/balance/entities/balance.entity.ts` - Create**

- Define `Balance` with `@Schema({ timestamps: true, collection: 'balances' })`.
- Fields: required/unique/indexed `userEmail: string`; required integer `amountInCents: number` with default `0`, minimum `0`, and maximum safe-cents validation; Mongoose timestamps.
- Export `BalanceSchema` and `type BalanceDoc = Balance` per the entity derivation convention.

**`src/balance/entities/balance-request.entity.ts` - Create**

- Define `BalanceRequest` with timestamps and collection `balance_requests`.
- Fields: required/indexed `userEmail`; **required `userName: string` and required `userLastName: string`, both captured from the JWT at creation** (denormalized owner identity so the admin list never needs a user lookup); required integer/minimum-one/`immutable: true` `amountInCents`; optional `paymentReference`; enum/indexed/default-pending `status`; `adminInCharge: string | null` with explicit default `null`; optional `decisionReason`; optional `decisionAt`.
- `userName`/`userLastName` are captured once at creation and are not updated if the user later changes their profile name (point-in-time snapshot of who requested).
- Add `{ userEmail: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`, and `{ createdAt: -1 }` indexes.
- Export `BalanceRequestSchema` and `type BalanceRequestDoc = BalanceRequest`.

**`src/balance/entities/balance.entities.spec.ts` - Create**

- Inspect both generated schemas for required/default/enum/index contracts, safe integer-cent limits, immutable request amount, the unique wallet owner, explicit `adminInCharge: null` default, and the required denormalized `userName`/`userLastName` fields on `BalanceRequest`.

**`src/balance/dtos/balance.dto.ts` - Create**

- `CreateBalanceRequestDto`: required finite numeric `amount`, `@IsPositive()`, `@Max(100000)`, plus optional non-empty `paymentReference`.
- `GetBalanceRequestsQueryDto`: optional integer `month` (`@Min(1)`, `@Max(12)`), integer `year`, positive-integer `page=1`, and positive-integer `limit=10`; apply numeric coercion decorators. Service logic must still normalize runtime values because global `ValidationPipe` does not enable `transform`.
- `GetAdminBalanceRequestsQueryDto`: extend/reuse list fields and add optional `status: 'pending' | 'all'`, defaulting to `all` in service logic.
- `DecideBalanceRequestDto`: `action: 'approve' | 'reject'`, optional reason, and conditional `paymentReference` validation. It is required and non-empty when `action === 'approve'` and rejected when present for `action === 'reject'`, so the service never silently ignores a supplied reference.

**`src/balance/dtos/balance.dto.spec.ts` - Create**

- Validate request amount bounds, query coercion/ranges/default inputs, admin status values, decision action values, and the action-dependent payment reference contract through `class-validator`/`class-transformer`.

**`src/balance/dtos/balance-responses.dto.ts` - Create**

- Define all response classes as `{ version, data, message, error }` envelopes with Swagger metadata.
- `BalanceDataDto`: decimal `amount` only; `BalanceResponseDto.data.balance` wraps it.
- User request item: `id`, decimal `amount`, optional `paymentReference`, `status`, optional `decisionReason`, optional `decisionAt`, `createdAt`, `updatedAt`. Do not include `adminInCharge`.
- Admin request item extends the user-visible shape with `userEmail`, `userName` (the display name composed as `userName + ' ' + userLastName` from the request's denormalized fields), and nullable `adminInCharge`. No batch user lookup is performed — the name is read from the stored request.
- Add user/admin single-request wrappers and separate paginated wrappers containing `requests`, `total`, `page`, `limit`, and `totalPages`.
- Keep `decisionReason` visible in owner and admin shapes, as user-confirmed.

**`src/balance/balance.interface.ts` - Create**

- Derive service formatting aliases directly from response DTO classes; do not duplicate response interfaces.
- Add only internal operation types that are not response mirrors, such as the authenticated caller shape and the paginated query filter type.
- The authenticated caller shape (`BalanceCaller`) mirrors the JWT payload the service actually consumes: `email`, `name`, `lastName`, and `role` (see `PayloadToken` in `src/auth/auth.interface.ts`) — the JWT already carries all four, so no auth/token change is required to capture the requester's name.
- Any method with more than three inputs must use one object parameter.

#### Edge Cases

- New users and existing users without a `balances` document have an implicit zero balance.
- `adminInCharge` must persist as `null`, not an absent property, for new requests.
- User-facing response types make it impossible for the shaper to accidentally include `adminInCharge`.
- Month/year omission is handled by the service, not DTO field initializers, so both local and Lambda execution default consistently.

#### Test Coverage

- Money conversion and truncation boundaries.
- DTO acceptance/rejection for `0`, negative, `NaN`, infinity, over-maximum, invalid month/year, invalid status/action, and conditional payment reference.
- Mongoose schema defaults, enums, unique/index definitions, and explicit nullable admin field where schema-level tests are practical.

#### Success Criteria

- `pnpm exec jest src/balance/balance.utils.spec.ts src/balance/dtos/balance.dto.spec.ts src/balance/entities/balance.entities.spec.ts --runInBand`
- `pnpm build`

---

### Phase 2 - User Lookup and Notification Infrastructure

**Goal:** Add the batch/admin user lookup and the two tested email operations required by the balance service.

#### Changes Required

**`src/users/services/users.service.ts` - Modify after `findByEmail()` (currently lines 54-63)**

- Add `async findAdmins(): Promise<UserDoc[]>` using `userModel.find({ role: 'admin' }).select('email name lastName').exec()`; role is an array and MongoDB array membership handles the scalar query. This is the only new user helper required — it powers the request-created admin notification.
- Do **not** add `findByEmails` / batch name resolution. Because `BalanceRequest` now denormalizes `userName`/`userLastName` from the JWT at creation (user callout), the admin list reads the requester name from the stored request and needs no user lookup.
- Await model queries inside each `try` so asynchronous query failures are caught by the method's error wrapper.
- Do not add balance fields or assignment fields to `User`.

**`src/users/services/users.service.spec.ts` - Modify setup and add helper suites**

- Extend model mocks with `find`, projection/select chaining, and `exec` as required by the chosen query style.
- Cover the admin array-membership query, selected fields, and asynchronous database failures for `findAdmins`. No batch `$in` lookup coverage is needed (helper removed).

**`src/mail/dtos/mail.dto.ts` - Modify after `MailForgotPasswordDto`**

- Add `MailBalanceRequestCreatedDto` with admin recipient array, requester full name, decimal amount, optional payment reference, and creation date.
- Add `MailBalanceRequestDecisionDto` with user email/name, action/outcome, decimal amount, and optional reason.
- Do not add the currently unused forgot-password `hostname` pattern to these DTOs.

**`emails/BalanceRequestCreated.tsx` - Create**

- Add a typed default React Email component following `ResetPassword.tsx` structure and Kraft Envios branding.
- Spanish content must identify the requester, formatted amount, optional transfer reference, and request date.

**`emails/BalanceRequestDecision.tsx` - Create**

- Add a typed default React Email component for approved/rejected outcomes.
- Spanish content must show outcome, amount, and reason only when present.

**`src/mail/services/mail.service.ts` - Modify after `sendUserForgotPasswordEmail()`**

- Add `sendBalanceRequestCreatedEmail(payload: MailBalanceRequestCreatedDto): Promise<void>`; render the created template and send one Resend request with `to` set to the admin email array.
- Add `sendBalanceRequestDecisionEmail(payload: MailBalanceRequestDecisionDto): Promise<void>`; render the decision template and send to the requester.
- Follow the existing sender/config/Resend pattern and keep throwing on direct mail failure. Best-effort isolation belongs in `BalanceService`, which owns mutation semantics.

**`src/mail/services/mail.service.spec.ts` - Modify**

- Extend mocks and assertions for both templates, array recipients, subjects, optional props, and Resend rejection.
- Load the new TSX template modules in this suite rather than replacing them with virtual template mocks, so the configured transform and component imports are exercised; Resend itself remains mocked.
- Preserve forgot-password coverage.

**`package.json` - Modify Jest `transform` at lines 114-116**

- Expand the transform expression from TS/JS only to TSX/JSX as a direct prerequisite for importing and testing React Email templates.
- Keep the existing Jest root, mapper, and test pattern unchanged; do not address the unrelated JWT guard suite here.

#### Edge Cases

- No admin accounts: the balance service will log and skip notification rather than call Resend with an empty recipient array.
- Missing user after a committed request/decision: notification failure remains best-effort and cannot roll back the mutation.
- Optional reference/reason must not render blank labels in templates.

#### Test Coverage

- User helper query shapes and error handling.
- Correct template props, recipients, subjects, and rendered HTML passed to Resend.
- Both approval and rejection rendering with and without optional reason.
- Mail service continues to surface send errors to its caller so BalanceService can deliberately isolate them.

#### Success Criteria

- `pnpm exec jest src/users/services/users.service.spec.ts src/mail/services/mail.service.spec.ts --runInBand`
- `pnpm build`
- Manual: run `pnpm email` and preview both templates with optional fields present and absent.

---

### Phase 3 - Balance Service and Request Lifecycle

**Goal:** Implement wallet reads, request CRUD/lists, transactional decisions, ownership/state guards, response shaping, and best-effort notifications.

#### Changes Required

**`src/balance/services/balance.service.ts` - Populate** (file generated by `nest g s balance/balance` in Phase 1)

- Inject both models with `@InjectModel`, the Mongoose `Connection` with `@InjectConnection()`, `UsersService`, `MailService`, and typed `config`.
- Wrap database-facing async operations in the repository `KraftError` pattern and rethrow existing `KraftError` unchanged. Notification helpers are the deliberate exception: catch/log lookup or MailService errors and do not rethrow after a committed mutation.
- Use the existing shared `KraftError` class from `@/guides/kraft-error` so the global filter recognizes balance errors.

Public API signatures:

- `createRequest(user: BalanceCaller | undefined, dto: CreateBalanceRequestDto): Promise<BalanceRequestResponseDto>`
- `getRequestsByUser(user: BalanceCaller | undefined, filters: GetBalanceRequestsQueryDto): Promise<PaginatedBalanceRequestsResponseDto>`
- `getAllRequests(adminUser: BalanceCaller | undefined, filters: GetAdminBalanceRequestsQueryDto): Promise<PaginatedAdminBalanceRequestsResponseDto>`
- `decideRequest(requestId: string, adminUser: BalanceCaller | undefined, dto: DecideBalanceRequestDto): Promise<AdminBalanceRequestResponseDto>`
- `cancelRequest(requestId: string, user: BalanceCaller | undefined): Promise<BalanceRequestResponseDto>`
- `getBalance(user: BalanceCaller | undefined): Promise<BalanceResponseDto>`
- `assertSufficientBalance(userEmail: string, amount: number): Promise<BalanceResponseDto>`
- `debitBalance(args: { userEmail: string; amount: number; session?: ClientSession }): Promise<BalanceResponseDto>`

Key logic and placement:

1. Add one caller helper that resolves the authenticated `BalanceCaller` from `req.user`, rejecting a missing JWT `email`; it also exposes `name`/`lastName` for denormalized persistence. Admin methods additionally validate `role.includes('admin')` in service logic rather than relying only on controller guards.
2. `createRequest`: truncate/convert the request amount to cents, persist `pending` with `adminInCharge: null` **and `userName`/`userLastName` copied from the caller's JWT**, build the success envelope, then attempt admin-recipient lookup (`findAdmins`) and the created email in an isolated `try/catch`. The requester name in the email comes from the caller JWT directly (no lookup). Log mail/lookup failures and still return success.
3. `getBalance`: `findOne({ userEmail }).lean()`; shape no document as `amount: 0` without creating a wallet.
4. `getRequestsByUser`: build the bounded current/default month query plus `userEmail`, execute sorted pagination, and use only the owner shaper.
5. `getAllRequests`: validate admin, build the month query, add `status: 'pending'` only when requested, paginate, and compose each item's display name from the request's stored `userName + ' ' + userLastName`. No batch user lookup and no per-record fallback — the name is denormalized on the request at creation.
6. `decideRequest`: approval uses the transaction described above; rejection uses `findOneAndUpdate({ _id, status: 'pending' })`. Both record acting admin email/reason/time; only approval overwrites the request's payment reference with the required verified value. The wallet credit query must guard `current amountInCents <= MAX_SAFE_CENTS - credit`; a limit/null/duplicate-key branch rolls back the request decision and maps to a balance business error. Compose the admin-response display name from the request's stored `userName`/`userLastName` (no lookup), then notify the requester after commit in an isolated `try/catch`; failed mail cannot make required response fields undefined.
7. `cancelRequest`: load the request, compare `request.userEmail` with authenticated email, require `pending`, then conditionally update by `_id + userEmail + pending`. A race returning `null` is an invalid-state business error. Do not call MailService.
8. `assertSufficientBalance`: convert/truncate amount to cents and perform a read check; absent wallet or amount below charge throws the shared insufficient-funds `KraftError`, otherwise return the standard balance envelope rather than `void`.
9. `debitBalance`: perform exactly one guarded `findOneAndUpdate({ userEmail, amountInCents: { $gte: charge } }, { $inc: { amountInCents: -charge } }, { new: true, session })`; `null` throws the same insufficient-funds error. Do not implement read-then-write here.
10. Add owner/admin request shapers and one envelope builder using `configService.version`; the owner shaper includes `decisionReason` but can never emit `adminInCharge`.

**`src/balance/balance.module.ts` - Populate** (file generated by `nest g mo balance` in Phase 1)

- Register both models with `{ name, schema }` descriptors through `MongooseModule.forFeature`.
- Import `UsersModule` (for `findAdmins`) and `MailModule`.
- Provide and export `BalanceService`; controller registration is added in Phase 4.

**`src/balance/services/balance.service.spec.ts` - Create**

- Mock both Mongoose models, `Connection.transaction`, UsersService, MailService, and config.
- Assert exact conditional filters/updates and session propagation for approval.
- Use call-order assertions where ordering is an acceptance requirement.

**`src/balance/balance.module.spec.ts` - Create**

- Compile `BalanceModule` through `@nestjs/testing` with model, connection, UsersService, MailService, and config tokens mocked/overridden.
- Resolve `BalanceService` and inspect module metadata to verify both model registrations and the exported service contract. Controller metadata is added to this spec in Phase 4.

#### Edge Cases

- Multiple pending requests per email are allowed; no lookup/open-request guard is added.
- Concurrent decisions: only one conditional pending update succeeds; only that transaction credits the wallet.
- Approval credit failure rolls back the approved status; no decision email is sent.
- Email/admin/user lookup failures after mutation are logged and do not alter the returned success envelope.
- Cancellation distinguishes non-owner from terminal-state requests and sends no notification.
- Pagination handles zero results with `totalPages: 0` and always sorts newest first.
- Admin list name fallback handles deleted/missing user records.

#### Test Coverage

- Create truncation, pending/null-admin persistence, denormalized `userName`/`userLastName` persisted from the JWT caller, many pending requests, envelope, all-admin notification, and best-effort mail failure.
- Implicit-zero and existing wallet reads.
- Owner list isolation, month/year defaults and explicit windows, pagination, order, status/reason visibility, and admin-field omission.
- Admin pending/all filters and display-name composition from the request's stored `userName`/`userLastName` (no user lookup performed).
- Transactional approval success/rollback/double-decision, exact cents credit, required verified reference persistence, and notification timing.
- Approval near the maximum safe wallet amount succeeds only within the guard; overflow attempts roll back status and credit.
- Rejection without wallet update, optional reason, explicit rejection of `paymentReference`, terminal-state rejection, and notification.
- Owner-only pending cancel, non-owner denial, race/terminal-state denial, and zero mail calls.
- Initial sufficiency read and guarded debit success/null/concurrency behavior.
- Every async unknown failure maps to a `BAL-*` `KraftError`; existing KraftErrors retain code/message.

#### Success Criteria

- `pnpm exec jest src/balance/services/balance.service.spec.ts src/balance/balance.utils.spec.ts src/balance/balance.module.spec.ts --runInBand`
- `pnpm build`

---

### Phase 4 - HTTP API, Guards, and Root Registration

**Goal:** Expose the researched routes through a thin authenticated controller and register the module in the application.

#### Changes Required

**`src/balance/controllers/balance.controller.ts` - Populate** (file generated by `nest g co balance/balance` in Phase 1)

- Add `@ApiTags('Balance')`, class-level `@UseGuards(JwtGuard)`, and `@Controller('balance')`.
- Keep methods thin: pass `req.user`, body/query/id to the matching service method without business conditionals.
- Use explicit async return signatures matching the response DTO in the route table; controller parameters are typed as the matching body/query DTO plus `ExpressRequest`.
- Routes and return DTOs:

| Route | Controller delegation |
| --- | --- |
| `POST /balance/requests` | `createRequest(req.user, dto)` |
| `GET /balance/requests` | `getRequestsByUser(req.user, query)` |
| `GET /balance/requests/admin` | `getAllRequests(req.user, query)` with route `JwtGuard`, `RolesGuard`, `@Roles('admin')` |
| `PATCH /balance/requests/:id/decision` | `decideRequest(id, req.user, dto)` with admin guards/role |
| `PATCH /balance/requests/:id/cancel` | `cancelRequest(id, req.user)` |
| `GET /balance` | `getBalance(req.user)` |

- Add bearer auth, operation summaries, and concrete Swagger response types to every route.

**`src/balance/controllers/balance.controller.spec.ts` - Create**

- Mock BalanceService and assert each route forwards the raw authenticated user and DTO/query/id unchanged.
- Assert controller/route guard and role metadata for user/admin endpoints; do not retest guard internals.

**`src/balance/balance.module.ts` - Modify module metadata**

- Register `BalanceController` in `controllers` while retaining the exported service for guides.

**`src/balance/balance.module.spec.ts` - Modify controller/module assertions**

- Add `BalanceController` resolution and controller metadata assertions while preserving the Phase 3 provider/export compilation checks.

**`src/app.module.ts` - Verify (registration added by `nest g mo balance` in Phase 1)**

- Confirm `nest g mo balance` already imported and registered `BalanceModule` once (near `GuidesModule`). Only add/fix the import by hand if the CLI placed it inconsistently. No environment validation changes are needed.

**`.github/REPO_CONTEXT.md` - Modify module architecture, module details, routes, dependency map, and collections sections**

- Document `BalanceModule`, the two collections, user/admin endpoints, email dependencies, and `GuidesDbService -> BalanceService` integration.
- State that only persisted guide creation is balance-gated and mock creation bypasses the wallet.

#### Edge Cases

- Declare static `requests/admin` before any future parameterized request GET route to avoid route ambiguity.
- Controller guards are defense in depth; admin service methods still validate the caller role.
- `GET /balance` must not collide with `GET /balance/requests` because Nest resolves the more specific method paths.

#### Test Coverage

- Exact route-to-service argument forwarding.
- User routes carry JWT guard; admin routes carry JWT plus roles guard and admin metadata.
- Swagger response metadata points at owner vs admin response types.
- App/module compilation verifies model/provider/controller/export wiring and absence of a circular dependency.

#### Success Criteria

- `pnpm exec jest src/balance/controllers/balance.controller.spec.ts src/balance/services/balance.service.spec.ts src/balance/balance.module.spec.ts --runInBand`
- `pnpm build`
- Manual: with user/admin JWTs, verify all six routes, owner isolation, admin denial for a user token, current-month defaults, pending/all filtering, reason visibility, and absence of `adminInCharge` in user responses.

---

### Phase 5 - Persisted Guide Check and Atomic Debit

**Goal:** Reorder non-mock persisted guide creation so balance is checked before writes, debited atomically before the provider call, retained on provider failure, and never charged on retry.

#### Changes Required

**`src/guides/dtos/guides-db.dto.ts` - Modify around `QuoteSnapshotDto` and `CreateGuideDto` at current lines 284-347**

- Keep the existing `QuoteSnapshotDto` and `UpdateGuideDto.quote` validation unchanged so this story does not alter update behavior.
- Add a create-only quote DTO composed from `QuoteSnapshotDto` with `total` replaced by a required, finite, numeric, positive field (use Nest Swagger mapped types such as `OmitType`/`IntersectionType`, not a duplicated full quote class).
- Change only `CreateGuideDto.quote` to that create-only DTO. Missing/invalid total is then rejected at the HTTP boundary, while BalanceService still validates direct service calls.

**`src/guides/dtos/guides-db.dto.spec.ts` - Create**

- Validate that create requires finite, positive `quote.total`, including mock-mode payload DTOs, while update quote validation remains unchanged.

**`src/guides/entities/guide.entity.ts` - Modify `QuoteSnapshot.total` at current line 41**

- Mark `total` required for new quote snapshots so persisted guides created under this contract always record their charge basis.
- Existing documents without total remain readable; no migration or startup backfill.
- Add internal optional fields for backward-compatible persisted state: `balanceChargeStatus?: 'pending' | 'debited' | 'insufficient' | 'bypassed'`, `balanceDebitAmountInCents?: number`, and `balanceDebitedAt?: Date`. New create flows always set a status; old guide documents remain marker-less.
- The **reason** a balance-gated guide failed reuses the **existing** `failureInfo` field (`errorDetails` = human-readable reason, `errorCode` = shared insufficient-funds constant). No new reason field is added — the insufficient-funds path just populates `failureInfo` like the provider-failure path already does.
- Do not add these internal payment fields to `GuideDataDto` or `formatGuideResponse`.

**`src/guides/guides.module.ts` - Modify imports array around current lines 18-29**

- Import `BalanceModule` and add it to module imports so `GuidesDbService` can inject the exported service.

**`src/guides/services/guides-db.service.ts` - Modify constructor and `createGuide()` at current lines 41-109**

- Inject `BalanceService` after `UsersService` and Mongoose `Connection` through `@InjectConnection()` for the debit-plus-marker transaction.
- Keep the existing signature `createGuide(user, payload, mock?): Promise<GuideResponseDto>`.
- Normalize `payload.quote.total` through the balance money utility/service before any wallet operation.
- Build `normalizedTotal = fromMoneyCents(toMoneyCents(payload.quote.total))` once and persist that normalized value in `quoteData.quote.total`; wallet checks/debits and the stored charge basis must use the same cents conversion.
- For non-mock requests, execute in this exact order:

1. Validate JWT email and resolve the database user as today.
2. Call `balanceService.assertSufficientBalance(user.email, normalizedTotal)` before incrementing the Kraft ID counter or creating a guide.
3. Generate `kraftId` and create a provisional guide with the request snapshot plus normalized `quote.total`, empty provider fields, retries/comments defaults, `status: 'waiting'`, and `balanceChargeStatus: 'pending'` (`bypassed` for mock requests).
4. Immediately before any provider API call, run a `Connection.transaction()` that calls `balanceService.debitBalance({ userEmail: user.email, amount: normalizedTotal, session })`, then conditionally updates `{ _id, status: 'waiting', balanceChargeStatus: 'pending' }` in the same session with `balanceChargeStatus: 'debited'`, `balanceDebitAmountInCents`, and `balanceDebitedAt`. A null guide update must throw and abort the transaction so the wallet debit cannot commit without its marker.
5. If guarded debit throws insufficient funds, let the transaction roll back, then update the provisional guide to `failed` with `balanceChargeStatus: 'insufficient'` and balance-specific `failureInfo`; rethrow and do not invoke provider/mocked-provider helpers.
6. Call `callProviderApi(payload)` only after successful debit.
7. Update the same provisional document through `findByIdAndUpdate(..., { new: true })` with current provider success/failure fields and final `created`/`failed` status; return `formatGuideResponse(updatedGuide, false, providerResult)` so non-persisted provider response fields remain available.

- For user-confirmed mock requests, skip steps 2, 4, and 5 entirely; still require/normalize positive `quote.total` through the create DTO, persist `balanceChargeStatus: 'bypassed'`, and use the provisional-create/final-update orchestration plus `mockProviderResult` so mock behavior exercises persistence without touching a real wallet.
- If provider execution fails, use the existing `ProviderResult` failure mapping; do not refund or compensate the wallet.
- Keep debit out of `callProviderApi`, `routeToProvider`, and shared helpers because retry/update reuse those paths.
- After a successful debit, catch every thrown provider/finalization error, including an existing provider `KraftError`; best-effort update the provisional guide to `failed` with the original code/message in `failureInfo`, never refund, then rethrow the original KraftError or apply the existing create-guide wrapper for unknown errors. No post-debit error may leave an intentionally handled request in `waiting`.

**`src/guides/services/guides-db.service.ts` - Modify `checkRetryEligibility()` at current lines 232 onward**

- Return ineligible unless `guide.status === 'failed'`.
- Then branch on `balanceChargeStatus`:
  - `debited` → eligible (provider retry, no re-debit).
  - `insufficient` → **eligible (revised per user callout)**; retry re-checks the wallet and may debit for the first time. Do not use the insufficient-funds error code to hard-block retry anymore — an insufficient guide is now the *retryable* balance case.
  - `pending` or `bypassed` → ineligible (provisional mid-flight, or mock guide that never touched the wallet).
  - `undefined` (legacy) → eligible under the existing pre-balance retry rules.
- Apply the existing 10-attempt limit and 5-minute cooldown to every eligible branch.

**`src/guides/services/guides-db.service.ts` - Modify `retryFailedGuide()`**

- Inject `BalanceService` here as well (already injected for `createGuide`); the retry path now needs it for the `insufficient` branch.
- After confirming eligibility, branch on `balanceChargeStatus`:
  - `insufficient`: run the same guarded debit transaction as create — `balanceService.assertSufficientBalance(user.email, normalizedTotal)` then the `Connection.transaction()` debit-plus-marker update that flips the guide to `balanceChargeStatus: 'debited'` with `balanceDebitAmountInCents`/`balanceDebitedAt`, **before** calling the provider. If still insufficient, leave the guide `failed`/`insufficient` (refresh `failureInfo`) and do not call the provider. Use the guide's stored `quote.total` as the charge basis (never re-derive a new amount).
  - `debited` and legacy `undefined`: proceed directly to the provider retry with **no** balance call, exactly as today. The debit already fired once (or never applied for legacy) and must not repeat.
- The debit still fires **at most once** per guide across create + retry: a guide can only be debited while transitioning out of `insufficient`/`pending`, never while already `debited`.

**`src/guides/guides.module.spec.ts` - Create**

- Inspect Nest module metadata to assert `GuidesModule` imports the actual `BalanceModule`, and retain the existing `GuidesDbService` unit construction test with a BalanceService mock.
- Root `AppModule` registration is verified by `pnpm build` plus configured local bootstrap/manual API verification; do not make this unit test depend on environment validation.

**`src/guides/services/guides-db.service.spec.ts` - Modify dependency setup and guide suites**

- Register a BalanceService mock in the testing module.
- Register a Mongoose Connection transaction mock and verify the same session reaches wallet debit and guide marker update.
- Cover a null conditional marker update: transaction aborts, provider is not called, and no wallet debit is committed.
- Update existing create assertions for provisional `create` followed by final `findByIdAndUpdate(..., { new: true })` instead of one final-state create.
- Add call-order and branch coverage for initial check, guarded debit, provider invocation, provider failure retention, race failure, mock bypass, and all retry branches: `debited` (no balance call), `insufficient` still-short (re-fail, no provider), `insufficient` topped-up (one debit + provider), and legacy marker-less.
- Ensure existing quote snapshot/internal-pricing tests remain intact.

#### Edge Cases

- Initial insufficiency: no Kraft ID increment, no guide write, no provider call, no wallet update.
- Concurrent drain after precheck: provisional guide becomes failed with balance error; guarded `$inc` does not execute, and provider is not called.
- Provider failure: debit remains (`debited`), guide is failed and retryable, and retry does not debit again.
- Insufficient-balance failed guide (`insufficient`): retry re-checks the wallet — if the user topped up, retry debits for the first time then calls the provider; if still short, the guide stays `failed`/`insufficient` and the provider is not called.
- `waiting` (`pending`), mock-success, and mock-failure (`bypassed`) guides are not retryable; mock flows neither read nor debit balance. `insufficient` guides **are** retryable (may debit once); `debited` guides are retryable without re-debit.
- Legacy `failed` guides without a charge marker retain their current retry eligibility rules.
- Existing guides lacking `quote.total` remain readable; retry continues using quote ID and never derives a new debit.
- The current client-supplied quote snapshot remains authoritative by accepted scope; server-side quote revalidation is not introduced.

#### Test Coverage

- Missing/zero/negative/non-finite/sub-cent/unsafe `quote.total` validation, positive truncation, and normalized stored total.
- Strict operation order for non-mock success.
- Initial insufficient balance causes zero counter/guide/provider writes.
- Guarded debit null/error persists failed balance `failureInfo` and causes zero provider calls; null marker transition aborts both transaction changes and also causes zero provider calls.
- Provider success and failure both have exactly one debit; provider failure has zero refunds.
- Debit and guide `debited` marker use one session/transaction; transaction rollback leaves neither change committed.
- Mock modes have zero balance method calls and failed mocks cannot retry into a real provider call.
- Waiting guides cannot retry; legacy marker-less failed guides remain backward compatible.
- Retry of a `debited` (charged) provider failure has zero balance method calls. Retry of an `insufficient` failure: (a) still-short wallet re-fails as `insufficient` with no provider call, and (b) topped-up wallet debits exactly once, flips the marker to `debited`, and then calls the provider. `bypassed`/`pending` guides remain non-retryable.
- Existing user resolution, provider result, quote response, update, and listing behavior remains covered.

#### Success Criteria

- `pnpm exec jest src/guides/dtos/guides-db.dto.spec.ts src/guides/guides.module.spec.ts src/guides/services/guides-db.service.spec.ts src/balance/services/balance.service.spec.ts --runInBand`
- `pnpm build && pnpm bundle`
- Manual in a non-production environment: approve a request, confirm `GET /balance`, create a persisted guide with a valid quote, confirm one debit and retained debit for provider failure, then retry the failed guide and confirm no second debit.
- Manual: create a persisted guide against an under-funded wallet, confirm the guide is `failed`/`insufficient` with a balance `failureInfo` reason and no debit; then approve a top-up request and retry the same guide, confirming exactly one debit occurs and the provider is then called.
- Manual: submit two concurrent persisted creations whose combined totals exceed the wallet; confirm at most one guarded debit succeeds, no negative balance occurs, and the losing guide never reaches a provider.
- Manual: create both mock outcomes and confirm wallet amount is unchanged.

---

## Final Verification Matrix

| Area | Automated command | Manual focus |
| --- | --- | --- |
| Money/contracts | `pnpm exec jest src/balance/balance.utils.spec.ts src/balance/dtos/balance.dto.spec.ts src/balance/entities/balance.entities.spec.ts --runInBand` | Decimal input/output remains two-place truncated |
| Users/mail | `pnpm exec jest src/users/services/users.service.spec.ts src/mail/services/mail.service.spec.ts --runInBand` | Template content and all-admin recipient list |
| Balance lifecycle | `pnpm exec jest src/balance/services/balance.service.spec.ts src/balance/balance.module.spec.ts --runInBand` | Create/approve/reject/cancel/list/read workflows |
| HTTP delegation/guards | `pnpm exec jest src/balance/controllers/balance.controller.spec.ts --runInBand` | User/admin authorization and response visibility |
| Guide integration | `pnpm exec jest src/guides/dtos/guides-db.dto.spec.ts src/guides/guides.module.spec.ts src/guides/services/guides-db.service.spec.ts --runInBand` | Debit ordering/marker transaction, concurrency fallback, failure retention, retry/no-charge, mock bypass |
| Deployable artifact | `pnpm build && pnpm bundle` | Lambda bundle produced after successful build |

Do not use the full `pnpm test` result as this story's green gate until the pre-existing unrelated JWT guard suite failure is resolved. The targeted mail suite is expected to become green through the TSX transform correction in Phase 2.

---

## Assumptions

- MongoDB is deployed as an Atlas replica set/transaction-capable cluster; approval requires a multi-document transaction to satisfy atomic request-and-wallet mutation.
- API currency values are positive decimal units; integer cents are an internal persistence detail and never exposed as cents.
- Existing users without a wallet document have a zero balance; no eager backfill is needed.
- Admin-list `status` omitted or `all` means all statuses for the selected month; `pending` means pending only.
- A missing user record during admin name resolution falls back to `userEmail`.
- Existing direct provider routes and `updateGuideData` retain current behavior by explicit user decision.
- Existing quote snapshots are client supplied; making create `quote.total` required/positive addresses charge presence but does not authenticate the quoted price against a server-side quote store.

## Unresolved Questions Before Implementation

None. Planning gaps were resolved by the user: DB-create-only charging, mock wallet bypass, payment reference required on approval, and owner visibility of decision reason.

## Decisions Made Beyond the Research Doc

- Store money as integer `amountInCents` fields and convert only at API/email boundaries, rather than using repeated floating-point `$inc` operations.
- Use a MongoDB transaction for approval's request transition plus wallet credit; individually atomic operations are insufficient across two collections.
- Make persisted guide creation's `quote.total` finite, positive, and required as a direct prerequisite of charging.
- Reuse guide `waiting` for provisional persistence and `failed` plus an internal `balanceChargeStatus` marker for outcomes; no new public guide status is added. These markers live on the existing `Guide` entity (`src/guides/entities/guide.entity.ts`), and the failure reason reuses the existing `failureInfo` field rather than adding a new one.
- Commit guarded debit and the guide's charged marker in one transaction. Block retries for `pending`/`bypassed` markers and never re-charge `debited` or legacy failures. **Make `insufficient`-marked guides retryable (user callout):** their retry re-runs the balance check and guarded debit, so a user who tops up their wallet can retry the same failed guide, which then debits for the first time and calls the provider. The debit still fires at most once per guide.
- **Denormalize the requester's `name` and `lastName` from the JWT onto each `BalanceRequest` at creation (user callout).** The admin list and decision responses read the display name straight from the stored request, eliminating the researched `UsersService.findByEmails` batch lookup and its missing-user fallback. Only `findAdmins` (for the created-notification recipients) is added to `UsersService`. The JWT already carries `name`/`lastName` (`PayloadToken`), so no auth/token change is required.
- Scaffold the module, service, and controller with the Nest CLI (`nest g mo/s/co balance`) per IMPLEMENTATION_GUIDELINES, which also performs the `AppModule` registration; hand-authoring is limited to entities, DTOs, utils, constants, interfaces, and templates.
- Add Jest TSX transformation so the required React Email templates and MailService tests can load reliably.
- Treat admin status omission as `all`, while month/year omission defaults to the current bounded month.
