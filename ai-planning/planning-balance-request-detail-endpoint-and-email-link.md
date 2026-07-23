# Plan: Single balance-request detail endpoint + email deep link

Research: [`ai-research/balance-request-detail-endpoint-and-email-link.md`](../ai-research/balance-request-detail-endpoint-and-email-link.md)

Two independently testable deliverables:
- **Phase 1** — admin-only `GET /balance/requests/admin/:id` returning one request in admin detail shape.
- **Phase 2** — `requestId` flows into the `BalanceRequestCreated` email; informational text becomes a `Ver solicitud` link button to `${FRONTEND_URI}/dashboard/requests/{requestId}`.

Research is plan-ready: open questions section is `None`; the one planning decision (where the URL is assembled) is resolved below (Decision D1). All source references in the research were verified against current code.

---

## Phase 1 — Admin single-request detail endpoint

Traces to AC 1, AC 2.

### 1.1 Service method — `src/balance/services/balance.service.ts`

- **Action:** modify. Add one public method, placed after `cancelRequest` (ends line 223) and before `getBalance` (line 225), so the request-lifecycle methods stay grouped.
- **Signature:**
  ```ts
  async getRequestByIdAdmin(
    user: BalanceCaller | undefined,
    requestId: string,
  ): Promise<AdminBalanceRequestResponseDto>
  ```
- **Key logic (read-only, no mutation):**
  1. `const admin = this.getAdminCaller(user);` — admin gate (`388-399`); non-admin → `BAL_AUTH_002` / `MSG_BALANCE_REQUEST_FORBIDDEN` (403), unauthenticated → `BAL_AUTH_001` (401). `admin` is used only for the gate; the fetch is not scoped to the admin's email (admins read **any** user's request).
  2. **Malformed-id guard (edge case):** before `findById`, reject a non-ObjectId id explicitly so it returns 404, not a DB error. Use `isValidObjectId(requestId)` (import `isValidObjectId` from `mongoose`); if false, throw `new KraftError(BAL_NF_001, MSG_BALANCE_REQUEST_NOT_FOUND, undefined, HttpStatus.NOT_FOUND)`. See rationale below.
  3. `const request = await this.balanceRequestModel.findById(requestId).exec();` — if falsy, throw the same `BAL_NF_001` 404 (identical to `cancelRequest` lines 190-197).
  4. `return this.envelope({ request: this.formatAdminRequest(request) });` — reuses `envelope` (463-475) and `formatAdminRequest` (452-461).
  5. Wrap the body in `try { … } catch (error) { this.rethrowDatabaseError(error); }` (same shape as sibling methods); `rethrowDatabaseError` (535-541) re-throws `KraftError` untouched, so the 404/403 codes survive.
- **Why the explicit ObjectId guard (non-obvious):** `cancelRequest` calls `findById` without an ObjectId check. A malformed `:id` makes Mongoose throw a `CastError`, which `rethrowDatabaseError` currently maps to `BAL_BDN_001` / `MSG_BALANCE_DATABASE_ERROR` — **not** the `BAL_NF_001` 404 that AC 2 requires. The `isValidObjectId` short-circuit is what makes "malformed id → 404" true. Do **not** rely on the catch clause for this.
- **No new DTO, constant, or interface:** `AdminBalanceRequestResponseDto` (`balance-responses.dto.ts:74-86`), `AdminBalanceRequestItemDto` (`49-58`), `BAL_NF_001`/`BAL_AUTH_002` and their messages (`balance.constants.ts:18-30`) all already exist and are already imported in the service.

### 1.2 Controller route — `src/balance/controllers/balance.controller.ts`

- **Action:** modify. Add one handler, placed immediately after `getAdminRequests` (ends line 72), keeping the two admin routes adjacent.
- **Route + guards:**
  ```ts
  @Get('requests/admin/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one balance request with admin scope' })
  @ApiResponse({ status: 200, type: AdminBalanceRequestResponseDto })
  async getAdminRequestById(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
  ): Promise<AdminBalanceRequestResponseDto>
  ```
  Body delegates only: `return this.balanceService.getRequestByIdAdmin(req.user as BalanceCaller | undefined, id);`. Controller stays thin (no logic beyond extracting the user).
- **Route-ordering check (verify, not guess):** existing GET routes are `requests/admin` (static, 58), `requests` (static, 74), plus `@Get()` (120). There is **no** bare `@Get('requests/:id')`, so `requests/admin/:id` is unambiguous. `@Param('id')`, `@Get`, `RolesGuard`, `Roles`, `AdminBalanceRequestResponseDto` are all already imported — no import changes expected; confirm during edit.

### Phase 1 success criteria

- `pnpm build` passes (compile-checks the DTO-typed return and new imports).
- `pnpm test -- balance` passes (targeted; see caveat C1 about the mail suite).
- Test coverage areas (Phase 1):
  - **Service:** admin fetches another user's request → 200 with admin shape (`userEmail`, `userName`, `adminInCharge`); non-admin caller → 403 `BAL_AUTH_002`; missing/anonymous user → 401 `BAL_AUTH_001`; well-formed id with no match → 404 `BAL_NF_001`; malformed (non-ObjectId) id → 404 `BAL_NF_001` (asserts the guard, not a 500).
  - **Controller:** handler passes the raw `req.user` and `id` straight through to `getRequestByIdAdmin`; route carries `JwtGuard`+`RolesGuard` and `@Roles('admin')` metadata.

---

## Phase 2 — Balance request email deep link

Traces to AC 3, AC 4, AC 5.

### 2.1 Mail DTO — `src/mail/dtos/mail.dto.ts`

- **Action:** modify `MailBalanceRequestCreatedDto` (44-63). Add a required field:
  ```ts
  @IsString()
  @IsNotEmpty()
  readonly requestId: string;
  ```
  Keep all existing fields (`adminEmails`, `requesterName`, `amount`, `paymentReference?`, `createdAt`). `requestId` is the Mongo `_id` string.

### 2.2 Mail service — `src/mail/services/mail.service.ts`

- **Action:** modify `sendBalanceRequestCreatedEmail` (51-73). Build the frontend URL here (Decision D1, mirrors `sendUserForgotPasswordEmail` line 31) and pass it to the template:
  ```ts
  const url = `${this.configService.frontend.uri}/dashboard/requests/${payload.requestId}`;
  const emailHtml = await render(
    React.createElement(BalanceRequestCreated, { ...payload, url }),
  );
  ```
  Replaces the current `React.createElement(BalanceRequestCreated, payload)` (58-59). Everything else in the method (Resend client, `to: payload.adminEmails`, subject, error mapping) is unchanged.

### 2.3 Email template — `emails/BalanceRequestCreated.tsx`

- **Action:** modify.
  - Add `url: string` to `BalanceRequestCreatedProps` (12-17) and destructure it in the component params (25-30).
  - Import `Link`, `Row`, `Column` from `@react-email/components` (extend the existing import block 2-10).
  - Keep existing content unchanged: heading, `{requesterName} solicito…`, `Monto solicitado`, conditional `Referencia de transferencia`, `Fecha de solicitud` (42-49).
  - Add the CTA after the `Fecha de solicitud` `Text`, following the ResetPassword pattern (`emails/ResetPassword.tsx:45-54`):
    ```tsx
    <Row className="my-0 mx-auto">
      <Column align="center">
        <Link
          href={url}
          className="text-white bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 text-center max-w-min"
        >
          Ver solicitud
        </Link>
      </Column>
    </Row>
    ```

### 2.4 Balance notification payload — `src/balance/services/balance.service.ts`

- **Action:** modify `notifyRequestCreated` payload (485-491). Add:
  ```ts
  requestId: request._id.toString(),
  ```
  `request._id` is already used by `formatRequest` (441), so the value is available. Best-effort semantics are preserved: the method already wraps in try/catch and only `console.error`s (493-498) — do **not** change that; email failure must not fail `createRequest`.

### Phase 2 success criteria

- `pnpm build` passes (the new required `requestId` field forces the `notifyRequestCreated` caller to supply it — a compile-time check that AC 4's data flow is wired).
- Test coverage areas (Phase 2):
  - **Mail service:** `sendBalanceRequestCreatedEmail` builds `url` as `${frontend.uri}/dashboard/requests/${requestId}` and passes `url` into the rendered template.
  - **Balance service:** `notifyRequestCreated` includes `requestId = request._id.toString()` in the mail payload; when `sendBalanceRequestCreatedEmail` rejects, `createRequest` still resolves successfully (best-effort intact).
- **Caveat C1:** per AGENTS.md, `src/mail/services/mail.service.spec.ts` currently fails to load (React/jsx-runtime), so `pnpm test -- mail` is **not** a green gate. Add/adjust the mail assertions, but verify Phase 2 primarily via `pnpm test -- balance` and `pnpm build`; note the pre-existing mail-suite failure rather than trying to fix it in this story.

---

## Decisions made beyond the research doc

- **D1 — URL assembled in `mail.service`, `requestId` is the DTO contract.** The research left "build here vs. pass in" open. Plan: `MailBalanceRequestCreatedDto` carries `requestId`; `sendBalanceRequestCreatedEmail` constructs the URL from `configService.frontend.uri` (mirrors `sendUserForgotPasswordEmail`). Keeps the balance service ignorant of frontend routing and matches the ResetPassword precedent.
- **D2 — explicit `isValidObjectId` guard** in `getRequestByIdAdmin` to satisfy AC 2's "malformed id → 404", since the existing `rethrowDatabaseError` path would otherwise map a `CastError` to a 500-class DB error, not a 404.

## Assumptions

- Carried from research: no user-scoped single-request endpoint needed now; existing admin DTOs suffice; adding `requestId` to `MailBalanceRequestCreatedDto` is safe (sole caller is `notifyRequestCreated`); no new env vars (`FRONTEND_URI` already validated).
- The frontend consumes the item DTO's `id` field as `requestId` for the deep link — the same string passed to `GET /balance/requests/admin/:id`.

## Unresolved questions before implementation

None. Ready for sign-off.

## Implementation checklist

- [x] Phase 1 — Admin single-request detail endpoint (`getRequestByIdAdmin` service method, `GET /balance/requests/admin/:id` route, unit tests). `pnpm build` and `pnpm test -- balance` pass.
- [x] Phase 2 — Balance request email deep link (DTO `requestId`, mail service URL assembly, email template CTA, `notifyRequestCreated` payload). `pnpm build` and full `pnpm test` pass (685/685, 39 suites) — the mail-service and jwt-guard suites flagged as pre-existing failures in AGENTS.md now pass too.
