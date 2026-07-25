# Plan - Environment-aware frontend URLs in emails

**Story:** Make the frontend base URL used in outgoing emails environment-aware, so local links resolve to `http://localhost:3000` while stage and prod use `FRONTEND_URI` verbatim.
**Research doc:** [`ai-research/environment-aware-email-links.md`](../ai-research/environment-aware-email-links.md)
**Research memory:** [`memories/repo/environment-aware-email-links-research.md`](../memories/repo/environment-aware-email-links-research.md)
**Status:** Ready for implementation

## Scope

### In Scope

- Introduce a three-value `NODE_ENV` convention (`local` | `development` | `production`), constant-backed and Joi-constrained at bootstrap (AC 5).
- Widen the T1 store-id branch so `local` keeps resolving to `defaultStoreId`, preventing local guide creation from hitting the real T1 store (AC 4).
- Centralize frontend base-URL resolution inside `MailService` and use it for both the forgot-password and balance-request-created links (AC 1, AC 2, AC 3).
- Remove the dead `hostname` field from `MailForgotPasswordDto` and its computation in `UsersService.forgotPassword` (AC 3).
- Drop the obsolete `.env` file and point `pnpm dev:sls` at `.env.local` (AC 6).
- Update the unit tests whose config mocks or payload fixtures are invalidated by the above (AC 1-4).

### Out of Scope

- `sendBalanceRequestDecisionEmail` — it renders no link.
- The `isProd` provider-token-slot branches (`t1.service.ts:142,157`, `manuable.service.ts:292,313,489,517`) and the auth cookie `secure` flag (`auth.controller.ts:48`). All read `env === PROD_ENV`; stage stays `development` and local moves `development` → `local`, so neither flips. No change needed.
- Any broader audit of environment branching beyond the four call sites recorded in research.
- Introducing a new environment variable — detection reuses `NODE_ENV`.
- Editing `.env.stage` / `.env.prod`; they are gitignored and absent from this machine. They are a manual verification step in Phase 4.

## Acceptance-Criteria Traceability

| Acceptance criterion | Planned phases |
| --- | --- |
| AC 1 - `local` renders links against `${FRONTEND_URI}:${FRONTEND_PORT}` | 1, 2 |
| AC 2 - `development` / `production` render links against `FRONTEND_URI` with no port | 2 |
| AC 3 - base-URL resolution lives in one place in `MailService`; `hostname` is gone | 2, 3 |
| AC 4 - `NODE_ENV=local` does not regress T1 store-id selection | 1 |
| AC 5 - env files carry the agreed values; Joi rejects anything else | 1, 4 |
| AC 6 - `.env` removed, `pnpm dev:sls` boots from `.env.local` | 4 |

## Verified Deviations From The Research Doc

These were checked against the working tree during planning and change the plan's shape:

- **`src/main.ts:1` already calls `process.loadEnvFile('.env.local')`**, and `src/app.module.ts:29` already sets `ConfigModule.forRoot({ envFilePath: '.env.local' })`. `.env` is therefore consumed only by Serverless Framework's default dotenv pickup under `pnpm dev:sls`. Removing it affects that one script — `pnpm dev` / `pnpm watch` are unaffected. (`AGENTS.md:25` claiming `main.ts` loads `.env` is stale.)
- **The full test suite is currently green** — 39 suites / 685 tests pass, including `src/mail/services/mail.service.spec.ts`. `AGENTS.md`'s "2 failing suites" note is stale, so `pnpm test` is a usable gate for every phase.
- **`package.json` `dev:sls` is line 15** as research recorded; `dotenv-cli ^11.0.0` is already a devDependency (`package.json:85`).

## Technical Decisions

- `LOCAL_ENV = 'local'` joins `DEV_ENV` / `PROD_ENV` in `src/app.constant.ts`. Environment strings stay centralized as constants; nothing inlines the literal.
- A `NON_PROD_ENVS` constant (`[LOCAL_ENV, DEV_ENV]`) typed as `string[]` expresses "not production" for the T1 store branch. Typing it as `string[]` (not a literal tuple) lets `.includes()` accept the `string | undefined` config value without a cast.
- `config.environment` stays typed `string | undefined`. Joi guarantees presence at bootstrap, but unit tests inject mock config objects that bypass Joi entirely, so comparisons keep a `?? ''` fallback rather than a non-null assertion.
- Base-URL resolution is a **private method on `MailService`**, not a `mail.utils.ts` module. AC 3 asks for one place inside `MailService`, and the only two consumers are its own send methods.
- Only `LOCAL_ENV` appends the port. `development` and `production` return `FRONTEND_URI` verbatim.
- The port is appended defensively (research risk 5): the method strips trailing slashes and skips the port when `FRONTEND_URI` already ends in `:<digits>`, so a misconfigured `FRONTEND_URI=http://localhost:3000` cannot yield `http://localhost:3000:3000`.
- The existing destructure-with-fallback convention from `users.service.ts:128` (`{ uri = 'http://localhost', port = '3000' }`) moves into `MailService` along with the logic, since config values are typed optional.
- `.env-example` moves to `NODE_ENV=local`: it is the template for local setup, and `local` is now the value a local run requires.

## Phases

## Implementation Checklist

- [ ] Phase 1 - Three-value `NODE_ENV` contract and T1 store guard
- [ ] Phase 2 - Centralized frontend base URL in `MailService`
- [ ] Phase 3 - Remove the dead `hostname` plumbing
- [ ] Phase 4 - Env-file and script hygiene

---

### Phase 1 - Three-value `NODE_ENV` contract and T1 store guard

**Goal:** Make `local` a first-class, bootstrap-validated environment value without regressing T1 store selection.

**Why this is one phase:** renaming `.env.local`'s `NODE_ENV` and widening `t1.service.ts:402` must land together. Split apart, the intermediate state points local guide creation at the production T1 store (research risk 1).

#### Changes Required

**`src/app.constant.ts` - Modify lines 1-2**

- Add `export const LOCAL_ENV = 'local';` above the existing `DEV_ENV` / `PROD_ENV` exports.
- Add `export const NON_PROD_ENVS: string[] = [LOCAL_ENV, DEV_ENV];`. The explicit `string[]` annotation is deliberate — see Technical Decisions.
- Leave `DEV_ENV`, `PROD_ENV`, `ACCESS_TOKEN_COOKIE_NAME`, and `VERSION_RESPONSE` unchanged.

**`src/app.module.ts` - Modify the `NODE_ENV` rule at line 39 and the import block at lines 1-24**

- Change `NODE_ENV: Joi.string().required()` to `Joi.string().valid(LOCAL_ENV, DEV_ENV, PROD_ENV).required()`.
- Import `{ DEV_ENV, LOCAL_ENV, PROD_ENV }` from `./app.constant`, alongside the existing `./config.validation` import.
- Leave every other rule in the schema untouched, including the required `FRONTEND_PORT` (research risk 4 — deployed environments must keep supplying a value even though only `local` reads it).

**`src/t1/services/t1.service.ts` - Modify line 402 and the import at line 39**

- Replace `const currentStoreId = environment === DEV_ENV ? defaultStoreId : storeId;` with a check against `NON_PROD_ENVS`, e.g. `NON_PROD_ENVS.includes(environment ?? '') ? defaultStoreId : storeId`.
- Update the import to bring in `NON_PROD_ENVS`; drop `DEV_ENV` if line 402 was its only consumer in this file (it is — `PROD_ENV` at lines 142/157 stays).
- Do not touch lines 142 and 157. Their `env === PROD_ENV` semantics are unchanged by this story.

**`.env.local` - Modify `NODE_ENV`**

- `NODE_ENV=development` → `NODE_ENV=local`.
- Leave `FRONTEND_URI="http://localhost"` and `FRONTEND_PORT="3000"` as-is; they compose to the required `http://localhost:3000`.

**`src/t1/services/t1.service.spec.ts` - Modify the store-selection tests around lines 318-390**

- Add a case with `environment: 'local'` asserting `defaultStoreId` is selected — this is the regression guard for AC 4.
- Keep the existing `environment: 'development'` case (stage still resolves to `defaultStoreId`) and the `environment: 'production'` case at line 978 (resolves to `storeId`).

#### Edge Cases

- Any `NODE_ENV` outside the three values now fails at bootstrap instead of falling through to the production branch. This is the intended trade for the gitignored `.env.stage` / `.env.prod` (research open question 1).
- Unit tests inject mock config directly and never run Joi, so a spec mock with a stale `environment` string fails silently rather than at bootstrap. Every mock touched in this story must be updated explicitly.
- `undefined` environment (possible only in a mock) falls to the `storeId` branch via `?? ''`. That matches the current `=== DEV_ENV` behavior.

#### Test Coverage

- T1 store-id selection for `local`, `development`, and `production`.
- Existing `isProd` token-slot assertions must remain green, proving the `PROD_ENV` branches were untouched.

#### Success Criteria

- `pnpm test -- src/t1/services/t1.service.spec.ts`
- `pnpm build`
- Manual: `pnpm watch` boots with `NODE_ENV=local`; temporarily setting `NODE_ENV=locl` fails at bootstrap with a Joi validation error naming `NODE_ENV`.

---

### Phase 2 - Centralized frontend base URL in `MailService`

**Goal:** Resolve the frontend base URL in exactly one place and use it for both email links.

#### Changes Required

**`src/mail/services/mail.service.ts` - Add a private method after the constructor (line 21) and modify lines 31 and 57**

- Add `private getFrontendBaseUrl(): string`.
  - Read `const { frontend, environment } = this.configService;` then `const { uri = 'http://localhost', port = '3000' } = frontend;` (the fallback convention carried over from `users.service.ts:128`).
  - Normalize `uri` by stripping any trailing `/`.
  - Append `:${port}` only when `environment === LOCAL_ENV` **and** the normalized uri does not already end in an explicit port (`/:\d+$/`).
  - Return a base URL with no trailing slash, so callers can concatenate `/path` safely.
- Import `LOCAL_ENV` from `@/app.constant`.
- Line 31: build the reset URL from the method's result — `${base}/reset-password/${oneTimeToken}`.
- Line 57: build the balance-request URL from the same result — `${base}/dashboard/requests/${payload.requestId}`.
- Do not touch `sendBalanceRequestDecisionEmail` (lines 76-98) — it renders no URL.
- Leave the `emails/ResetPassword.tsx` and `emails/BalanceRequestCreated.tsx` templates untouched; both already receive the composed value via their `url` prop.

**`src/mail/services/mail.service.spec.ts` - Modify the config mock at line 43 and extend the URL assertions**

- Extend the mock to `frontend: { uri: 'https://example.com', port: '3000' }` plus an `environment` field. Set the default to a non-local value so the existing assertion at line 91 (`https://example.com/dashboard/requests/request-id-123`) still holds.
- For per-environment cases, mutate the injected mock's `environment` between tests — the pattern already used at `users.service.spec.ts:437` — rather than rebuilding the testing module.
- Assert the reset-password URL via the `React.createElement` spy (already installed at line 32), the same way the balance-request URL is asserted at lines 87-90. The reset test currently only asserts the `resend.emails.send` payload, which does not observe the URL.

#### Edge Cases

- `FRONTEND_URI` already carrying a port under `NODE_ENV=local` must not double-append (research risk 5).
- `FRONTEND_URI` with a trailing slash must not produce `//reset-password`.
- Missing `uri` / `port` in config falls back to `http://localhost` / `3000`, preserving today's `UsersService` behavior.

#### Test Coverage

- `local` → both URLs built on `http://localhost:3000` (AC 1).
- `development` → both URLs built on `FRONTEND_URI`, no port (AC 2).
- `production` → same as `development` (AC 2).
- `local` with a port already in `FRONTEND_URI` → port not duplicated.
- `FRONTEND_URI` with a trailing slash → single slash before the path.

#### Success Criteria

- `pnpm test -- src/mail/services/mail.service.spec.ts`
- `pnpm build`

---

### Phase 3 - Remove the dead `hostname` plumbing

**Goal:** Delete the never-read `hostname` field now that base-URL resolution lives in `MailService`.

#### Changes Required

**`src/mail/dtos/mail.dto.ts` - Modify `MailForgotPasswordDto`, deleting lines 20-23**

- Remove the `hostname` property with its `@IsString()`, `@IsNotEmpty()`, and `@ApiProperty()` decorators.
- Leave `email`, `oneTimeToken`, `name`, and `lastName` unchanged, and leave both balance DTOs untouched. All imported validators remain in use elsewhere in the file.
- No client-facing contract changes: this DTO is an internal service payload, not a request body. `ForgotPasswordBodyDto` (the actual `/users` body) never carried `hostname`, so the global `forbidNonWhitelisted` pipe is unaffected.

**`src/users/services/users.service.ts` - Modify `forgotPassword` (lines 124-155) and the import at line 38**

- Delete the `const { frontend, environment } = this.configService;` / `const { uri, port } = frontend;` / `completeHostname` block at lines 127-131.
- Delete `hostname: completeHostname,` from the `MailForgotPasswordDto` literal at line 142.
- Remove the now-unused `PROD_ENV` import at line 38 — line 130 was its only consumer in this file.
- Leave the rest of the method unchanged: user lookup, `generateJWT`, the `oneTimeToken` persist, the `sendUserForgotPasswordEmail` call, and the response envelope.

**`src/users/services/users.service.spec.ts` - Modify the forgot-password tests**

- Remove `hostname: 'http://localhost:3000'` from the expected payload at line 421.
- Delete the `'should use production hostname in production environment'` test at lines 436-459. The behavior it covered no longer exists in `UsersService`; the equivalent per-environment coverage now lives in `mail.service.spec.ts` (Phase 2).
- `mockConfig.frontend` / `mockConfig.environment` (lines 105-116) may stay — they are harmless — but can be trimmed once no test reads them. `version` is still required by the response envelope.

**`src/mail/services/mail.service.spec.ts` - Modify the fixture at line 59**

- Remove `hostname: 'https://test.com'` from the `MailForgotPasswordDto` literal. Left in place it is a TypeScript error against the trimmed DTO.

**`src/users/controllers/users.controller.spec.ts` - Verify only**

- The `frontend` mock at line 60 needs no change; the controller never computed a hostname. Confirm the suite stays green.

#### Edge Cases

- The compiler is the safety net here: any missed `hostname` reference fails `pnpm build` against the trimmed DTO.
- Swagger output for `MailForgotPasswordDto` loses the `hostname` example. It is not an exposed request schema, so no published API contract shifts.

#### Test Coverage

- Forgot-password flow still sends `{ email, name, lastName, oneTimeToken }` and returns the existing response envelope.
- Existing not-found and error-path tests for `forgotPassword` stay green.

#### Success Criteria

- `pnpm test -- src/users src/mail`
- `pnpm build`

---

### Phase 4 - Env-file and script hygiene

**Goal:** Retire `.env` and make every local entry point load `.env.local` explicitly.

#### Changes Required

**`.env` - Delete**

- Root `.env` (gitignored) holds `NODE_ENV="production"` with `FRONTEND_URI="http://localhost"` — a local run reporting itself as production. It would now also fail nothing at bootstrap while producing wrong email links.
- Safe to remove: `src/main.ts:1` loads `.env.local`, `src/app.module.ts:29` sets `envFilePath: '.env.local'`, and both `serverless.yml:57-60` and `serverless.stage.yml:57-60` already exclude `.env*` from the deployment package. Only `pnpm dev:sls` consumed it, via Serverless Framework's default dotenv pickup.

**`package.json` - Modify `dev:sls` at line 15**

- `serverless offline start` → `dotenv -e .env.local -- serverless offline start`.
- `dotenv-cli` is already a devDependency (line 85) and this mirrors `deploy-stage` / `deploy-prod` (lines 13-14). The `${env:...}` references in `serverless.yml` resolve from `process.env`, which `dotenv-cli` populates before Serverless starts.
- Leave `serverless.yml`'s `provider.stage: production` alone — that is the deploy stage name, unrelated to `NODE_ENV` (research risk 3).

**`.env-example` - Modify line 1**

- `NODE_ENV=development` → `NODE_ENV=local`, with a short comment noting the allowed values `local | development | production`.
- Do not otherwise reconcile this file with `src/app.module.ts`; its wider staleness (`AGENTS.md:21`) is out of scope.

**`README.md` - Modify the Environment Configuration section at line 46**

- "Create a `.env` file … based on `.env-example`" → `.env.local`, since the app no longer reads `.env`.

**`AGENTS.md` - Modify lines 10 and 25**

- Line 10: copy `.env-example` to `.env.local`, not `.env`.
- Line 25: `src/main.ts` loads `.env.local` via `process.loadEnvFile()` — correcting an already-stale statement that this change would otherwise cement.

#### Edge Cases

- `.env.stage` and `.env.prod` live outside the repo. `.env.stage` is already `NODE_ENV=development` and needs no change; `.env.prod` must read `NODE_ENV=production` before the next deploy. A stale value now fails Joi at Lambda cold start — loud rather than silent, which is the intended trade (research open question 1).
- Anyone with a local `.env` and no `.env.local` will find local startup broken after this change. `.env.local` is the documented file from here on.

#### Test Coverage

- No unit tests. This phase is verified by boot and by the full suite staying green.

#### Success Criteria

- `pnpm test` (baseline today: 39 suites / 685 tests passing — treat any failure as caused by this story)
- `pnpm build`
- Manual: `pnpm dev:sls` boots with `.env` deleted and serves a request.
- Manual: trigger a forgot-password and a balance-request-created email locally; both links point at `http://localhost:3000/...` (AC 1).
- Manual: confirm `.env.prod` carries `NODE_ENV=production` and `.env.stage` carries `NODE_ENV=development` before the next `pnpm deploy-prod` / `pnpm deploy-stage`.

## Post-Implementation Verification

1. `pnpm build && pnpm test` green.
2. `NODE_ENV=local` — both emails render `http://localhost:3000` links; T1 guide creation still uses `defaultStoreId`.
3. `NODE_ENV=development` and `NODE_ENV=production` — both emails render `FRONTEND_URI` links with no port.
4. `grep -rn "hostname" src emails` returns nothing.
5. An invalid `NODE_ENV` fails at bootstrap.
