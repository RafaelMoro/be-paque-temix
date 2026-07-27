# environment-aware-email-links — research notes

## `NODE_ENV` is load-bearing in more places than it looks

Moving `.env.local` from `NODE_ENV=development` to `NODE_ENV=local` is not a
cosmetic rename. Four call sites branch on the value:

- `src/t1/services/t1.service.ts:402` — `environment === DEV_ENV ? defaultStoreId : storeId`.
  This is the one that silently regresses: local runs currently land on
  `defaultStoreId` **because** `.env.local` says `development`. Rename without
  touching this line and local guide creation starts hitting the real T1 store.
- `src/t1/services/t1.service.ts:142,157` and `src/manuable/services/manuable.service.ts:292,313,489,517`
  — `isProd` is not a logging flag; it selects **which stored provider token slot**
  is read/written in `GeneralInfoDb` (`token-manager.service.ts:59,64`).
- `src/auth/controllers/auth.controller.ts:48` — `secure` flag on the auth cookie.

## `MailForgotPasswordDto.hostname` is dead code

`UsersService.forgotPassword` (`users.service.ts:127-131`) computes
`uri` vs `${uri}:${port}` and passes it as `hostname`. `MailService` never reads
it — it rebuilds the URL from `configService.frontend.uri` directly
(`mail.service.ts:31`). The env-aware behavior people assume exists has never
actually shipped.

## `.env` was a fourth env file — now obsolete

`.env` (gitignored, present locally) held `NODE_ENV="production"` with
`FRONTEND_URI="http://localhost"` — a local run that reported itself as production.
It is what `pnpm dev:sls` / Serverless Offline picked up via Serverless Framework's
default `.env` loading. Decision: `.env` is dropped; `dev:sls` must load `.env.local`
explicitly (`dotenv-cli` is already a devDependency, same pattern as
`deploy-stage` / `deploy-prod`).

`.env.stage` and `.env.prod` are gitignored and absent from the dev machine; they
are only materialized by `dotenv -e .env.stage|.env.prod` in the deploy scripts.

## Stage is a sandbox that mirrors local

`.env.stage` already carries `NODE_ENV=development` — it intentionally mimics
`.env.local`'s values, the way sbx environments do. So the three-value scheme
(`local` / `development` / `production`) only actually changes `.env.local`, and
stage behavior (provider token slot, cookie `secure` flag, T1 store) is untouched.
The corollary: any check meant to mean "not production" must accept **both**
`local` and `development`.

See [[balance-feature-research]] for the balance-request email flow this touches.
