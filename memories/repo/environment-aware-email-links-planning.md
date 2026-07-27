# Planning Note — Environment-aware Email Links

**Story:** Three-value `NODE_ENV` (`local` | `development` | `production`) plus environment-aware frontend base URL in `MailService`.
**Date:** 2026-07-24

## Two research claims that did not survive verification

1. **`.env` is *not* the local loader.** `src/main.ts:1` already calls
   `process.loadEnvFile('.env.local')` and `src/app.module.ts:29` already sets
   `ConfigModule.forRoot({ envFilePath: '.env.local' })`. `.env` is consumed only by
   Serverless Framework's default dotenv pickup under `pnpm dev:sls`. So deleting `.env`
   affects exactly one script — `pnpm dev` / `pnpm watch` never read it.
   `AGENTS.md:25` ("`main.ts` loads `.env`") is stale and is corrected as part of the work.
2. **The test suite is green.** 39 suites / 685 tests pass as of this date, including
   `src/mail/services/mail.service.spec.ts` and `src/auth/guards/jwt-guard/jwt-guard.guard.spec.ts`.
   `AGENTS.md`'s "2 failing suites" note is stale, so `pnpm test` is a valid phase gate —
   do not pre-excuse failures against it.

## `NON_PROD_ENVS` must be typed `string[]`, not a literal tuple

`config.environment` is `string | undefined`. A `readonly ['local','development'] as const`
array makes `.includes(environment ?? '')` a compile error (argument not assignable to the
literal union). Annotating `NON_PROD_ENVS: string[]` in `src/app.constant.ts` keeps the
call site cast-free.

## Joi does not protect unit tests

The three-value `NODE_ENV` enum is enforced at bootstrap only. Specs inject mock config
objects directly (`{ provide: config.KEY, useValue: {...} }`) and bypass validation entirely,
so a mock carrying a stale `environment` string fails silently rather than loudly. Every
config mock touched by an environment change must be updated by hand —
`mail.service.spec.ts:43`, `users.service.spec.ts:107`, `users.controller.spec.ts:60`,
`quotes.service.spec.ts:162`, `t1.service.spec.ts:54`.

## The one ordering constraint

`.env.local`'s `NODE_ENV` rename and the `t1.service.ts:402` widening must land in the same
commit. Any intermediate state where `NODE_ENV=local` exists without
`NON_PROD_ENVS.includes(...)` points local guide creation at the **production** T1 store.
See [[environment-aware-email-links-research]].

## Port appending is defensive, not naive

`getFrontendBaseUrl()` strips trailing slashes and skips the port when `FRONTEND_URI`
already ends in `:<digits>`, so a misconfigured `FRONTEND_URI=http://localhost:3000` cannot
produce `http://localhost:3000:3000`. Only `NODE_ENV=local` appends at all.
