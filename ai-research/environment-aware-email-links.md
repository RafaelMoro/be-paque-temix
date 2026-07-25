# Research: Environment-aware frontend URLs in emails

## Story

Email links currently point at a single `FRONTEND_URI` value with no port, so the
local development links are broken. Make the frontend base URL used in outgoing
emails environment-aware:

- **Local** → `http://localhost:3000` (built from `FRONTEND_URI` + `FRONTEND_PORT`)
- **Stage** → `FRONTEND_URI` as-is
- **Prod** → `FRONTEND_URI` as-is

Two links are affected:
1. Forgot-password link — `${base}/reset-password/{oneTimeToken}`
2. "Ver solicitud" balance-request link — `${base}/dashboard/requests/{requestId}`

This requires a three-value `NODE_ENV` convention so the three environments are
distinguishable at runtime.

## Decisions (confirmed with user)

- **`NODE_ENV` becomes a three-value enum**, one per env file:
  - `.env.local` → `local` (currently `development`)
  - `.env.stage` → `development`
  - `.env.prod` → `production`
- **Local URL is config-derived**, not hardcoded: `${FRONTEND_URI}:${FRONTEND_PORT}`.
  `.env.local` already holds `http://localhost` + `3000`, which yields
  `http://localhost:3000`.
- **URL building is centralized in `MailService`.** The currently-dead `hostname`
  field is removed from `MailForgotPasswordDto` and from `UsersService`.
- **Only local appends the port.** Both `development` (stage) and `production`
  use `FRONTEND_URI` verbatim.
- Research depth: quick. No broad audit of unrelated environment branching.

## Acceptance criteria

1. With `NODE_ENV=local`, both the forgot-password and balance-request-created
   emails render links against `http://localhost:3000` (i.e.
   `${FRONTEND_URI}:${FRONTEND_PORT}`).
2. With `NODE_ENV=development` (stage) or `NODE_ENV=production`, both emails
   render links against `FRONTEND_URI` with no port appended.
3. The base-URL resolution lives in one place inside `MailService`; `hostname` is
   gone from `MailForgotPasswordDto` and `UsersService.forgotPassword` no longer
   computes it.
4. `NODE_ENV=local` does not regress `T1Service` store-id selection — the
   local/sandbox store must still be chosen when running locally (see Risks).
5. The three env files carry the agreed `NODE_ENV` values and bootstrap still
   passes Joi validation in `src/app.module.ts`.

## Affected files & modules

| File | What matters |
| --- | --- |
| `src/mail/services/mail.service.ts:31` | Forgot-password URL — `${frontend.uri}/reset-password/${oneTimeToken}` |
| `src/mail/services/mail.service.ts:57` | Balance-request URL — `${frontend.uri}/dashboard/requests/${payload.requestId}` |
| `src/mail/dtos/mail.dto.ts` | `MailForgotPasswordDto.hostname` — required, validated, and never read |
| `src/users/services/users.service.ts:127-131` | Computes `completeHostname` (`uri` vs `uri:port`) and passes it as `hostname`; dead today |
| `src/app.constant.ts:1-2` | `DEV_ENV = 'development'`, `PROD_ENV = 'production'` — needs a `local` value |
| `src/config.ts:55-58,87` | `frontend.port`, `frontend.uri`, `environment` are already exposed |
| `src/app.module.ts:39` | `NODE_ENV: Joi.string().required()` — no enum constraint today |
| `.env.local`, `.env.stage`, `.env.prod` | `.env.stage` / `.env.prod` are gitignored and not present on this machine |
| `src/mail/services/mail.service.spec.ts:43` | Mocks `frontend: { uri: 'https://example.com' }` only — no `port`, no `environment` |
| `src/users/services/users.service.spec.ts:107`, `src/users/controllers/users.controller.spec.ts:60` | Also mock `frontend` config |

## Existing patterns to follow

- **Env branching**: `environment === PROD_ENV ? … : …` — the existing shape in
  `users.service.ts:130`, `t1.service.ts:142`, `manuable.service.ts:292`.
  Environment strings are centralized as constants in `src/app.constant.ts`, not
  inlined.
- **Config access**: inject `@Inject(config.KEY) private configService: ConfigType<typeof config>`
  and read `this.configService.frontend` / `.environment` (`mail.service.ts:19-21`).
- **Env defaults**: `users.service.ts:128` destructures with fallbacks
  (`{ uri = 'http://localhost', port = '3000' }`) because config values are
  typed `string | undefined`.

## Dependencies & integration points

- Call sites of the affected mail methods:
  - `src/users/services/users.service.ts:146` → `sendUserForgotPasswordEmail`
  - `src/balance/services/balance.service.ts:523` → `sendBalanceRequestCreatedEmail`
    (best-effort; email failure must not fail request creation)
  - `src/balance/services/balance.service.ts:544` → `sendBalanceRequestDecisionEmail`
    (no URL — out of scope)
- Templates consuming the URL: `emails/ResetPassword.tsx:48` and
  `emails/BalanceRequestCreated.tsx:58`, both via an `href={url}` prop.
- Env plumbing for deploys: `deploy-stage` runs `dotenv -e .env.stage -- sls deploy --config serverless.stage.yml`;
  `deploy-prod` runs `dotenv -e .env.prod -- sls deploy`. Both `serverless.yml`
  and `serverless.stage.yml` forward `NODE_ENV`, `FRONTEND_URI`, and
  `FRONTEND_PORT` into the Lambda environment (lines 13, 26-27).

## Risks & edge cases

1. **`NODE_ENV=local` breaks the T1 store-id branch.** `src/t1/services/t1.service.ts:402`
   reads `environment === DEV_ENV ? defaultStoreId : storeId`. Today `.env.local`
   is `development`, so local runs get `defaultStoreId`. Renaming to `local`
   silently flips local runs to the production `storeId`. This branch must be
   updated alongside the env change — it is the one hard regression in this story.
2. **Stage's previous `NODE_ENV` is unknown.** `.env.stage` is gitignored and
   absent locally. If it currently holds `production`, moving it to `development`
   flips behavior in three other places on stage:
   - `t1.service.ts:142,157` and `manuable.service.ts:292,313,489,517` — `isProd`
     selects which stored provider token slot is read/written in `GeneralInfoDb`
     (`token-manager.service.ts:59,64`). Stage would switch to the non-prod token.
   - `auth.controller.ts:48` — `secure: NODE_ENV === PROD_ENV` on the auth cookie.
     Stage would start issuing non-`secure` cookies over HTTPS.
   - `t1.service.ts:402` — stage would switch to `defaultStoreId`.
   These may all be intentional for a staging environment, but they are behavior
   changes, not no-ops.
3. **`.env` is a fourth, undeclared env file.** It exists locally with
   `NODE_ENV="production"` and `FRONTEND_URI="http://localhost"`, and is what
   `pnpm dev:sls` (Serverless Offline, stage `production`) picks up. Under the new
   scheme this is a local run reporting `production`, which would emit
   `http://localhost` with no port — a broken link. The three-value scheme does not
   cover it.
4. **`FRONTEND_PORT` is Joi-required** (`app.module.ts:45`) in every environment,
   including deployed ones where it is unused. Nothing breaks, but stage/prod must
   keep supplying a value.
5. **Trailing-slash / double-port**: if someone sets `FRONTEND_URI=http://localhost:3000`
   locally, naive concatenation yields `http://localhost:3000:3000`. Worth guarding
   or documenting the expected `.env.local` shape.
6. **Existing mail specs will fail**: `mail.service.spec.ts:43` mocks `frontend`
   without `port` and without `environment`; the balance-URL assertion at line 91
   asserts `https://example.com/dashboard/requests/request-id-123`. Removing
   `hostname` also touches the forgot-password payload fixture at line 59.

## Open questions

1. What is `NODE_ENV` in `.env.stage` today? Needed to size risk #2 — specifically
   whether the stage auth cookie's `secure` flag and the stage provider-token slot
   are about to change.
2. Should `t1.service.ts:402` treat `local` **and** `development` as
   "use `defaultStoreId`", or only `local`? This decides whether stage points at
   the T1 sandbox store or the real one.
3. What should `.env` (the `dev:sls` file) hold for `NODE_ENV` — `local`, or is
   that file considered obsolete?
4. Should `NODE_ENV` Joi validation be tightened to
   `Joi.string().valid('local', 'development', 'production').required()` so a typo
   fails at bootstrap instead of silently selecting the prod branch?

## Assumptions

- "Local" means `NODE_ENV=local` only; the port is appended in that case alone.
- `.env.local` keeps `FRONTEND_URI=http://localhost` and `FRONTEND_PORT=3000`, so
  the composed local base URL is `http://localhost:3000`.
- Stage and prod `FRONTEND_URI` values already include their scheme and any
  non-default port, and need no further composition.
- `sendBalanceRequestDecisionEmail` stays out of scope — it renders no link.
- No new environment variable is introduced; detection reuses `NODE_ENV`.
