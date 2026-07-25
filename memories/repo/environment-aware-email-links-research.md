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

## There are four env files, not three

`.env` (gitignored, present locally) holds `NODE_ENV="production"` with
`FRONTEND_URI="http://localhost"`. It is what `pnpm dev:sls` / Serverless Offline
reads — a local run that reports itself as production. Any `NODE_ENV`-based
"am I local?" check has to account for it or `dev:sls` gets prod behavior.

`.env.stage` and `.env.prod` are gitignored and absent from the dev machine; they
are only materialized by `dotenv -e .env.stage|.env.prod` in the deploy scripts.

See [[balance-feature-research]] for the balance-request email flow this touches.
