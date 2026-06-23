# Agent Notes — Kraft Envios API

## Toolchain (trust the lockfile, not the README)

- Use **pnpm**, not Bun. The repo has `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `engines` requiring `node >=22.16.0` and `pnpm >=10.11.1`.
- `pnpm install` is the correct first step.

## Environment

- Copy `.env-example` to `.env` and fill **all** values. The app validates env vars via Joi in `src/app.module.ts` on every bootstrap, so a missing key crashes startup.
- Required keys (verify against `src/app.module.ts`):
  - `NODE_ENV`, `PORT`
  - `CLUSTER`, `MONGO_CLUSTER_SUFFIX`, `MONGO_USER`, `MONGO_PWD`, `MONGO_DB_NAME`, `MONGO_CONNECTION`
  - `JWT_KEY`, `ONE_TIME_JWT_KEY`, `PUBLIC_KEY`, `ROLE_KEY`
  - `FRONTEND_PORT`, `FRONTEND_URI`
  - `RESEND_API_KEY`, `MAILER_MAIL`
  - `GUIA_ENVIA_KEY`, `GUIA_ENVIA_URI`
  - `T1_URI`, `T1_TK_URI`, `T1_GUIDES_URI`, `T1_CLIENT_ID`, `T1_CLIENT_SECRET`, `T1_USERNAME`, `T1_PASSWORD`, `T1_STORE_ID`, `T1_GUIDES_STORE_ID`
  - `PAKKE_KEY`, `PAKKE_URI`
  - `MANUABLE_EM`, `MANUABLE_PSS`, `MANUABLE_URI`
- Note: `.env-example` is incomplete/outdated compared to `serverless.yml` and `src/app.module.ts`.

## Entry points

- Local dev: `src/main.ts` → loads `.env` with `process.loadEnvFile()`, listens on `PORT` (default 3000).
- Lambda: `lambda.ts` → only loads `.env` when `NODE_ENV !== 'production'`. Uses `@codegenie/serverless-express` wrapping the Nest app.

## Common commands

- `pnpm watch` — local dev with reload.
- `pnpm dev:sls` — Serverless Offline on `http://localhost:3000` (stage `production`).
- `pnpm build` — Nest build to `dist/`.
- `pnpm bundle` — ncc-bundles `dist/lambda.js` into `.bundle/` for Lambda.
- `pnpm deploy` — build → bundle → `sls deploy`.
- `pnpm test` — Jest unit tests (`src/**/*.spec.ts`).
- `pnpm test:e2e` — E2E tests (`test/jest-e2e.json`).
- `pnpm test:cov` — coverage report to `coverage/`.
- `pnpm lint` — ESLint with `--fix`.

## Verification order

- Build must pass before bundling/deploying: `pnpm build && pnpm bundle`.
- Lint currently fails with ~117 errors / ~28 warnings (as of last run); do not treat `pnpm lint` as a green gate.

## Testing gotchas

- `pnpm test` currently has **2 failing suites**: `src/mail/services/mail.service.spec.ts` (React/jsx-runtime load issue) and `src/auth/guards/jwt-guard/jwt-guard.guard.spec.ts` (imports missing `IS_PUBLIC_KEY` from `@/auth/auth.constant`). 542 tests otherwise pass.
- Tests import source with the `@/*` alias mapped to `src/*` in both `tsconfig.json` and Jest config.

## Code style

- Prettier: `singleQuote: true`, `trailingComma: all`.
- ESLint: `typescript-eslint/recommendedTypeChecked`, explicit `any` allowed, `@typescript-eslint/no-floating-promises` is a warning.
- Path alias `@/*` resolves to `src/*`.

## Deployment

- Target: AWS Lambda `nodejs22.x` in `us-east-1`, API Gateway.
- Serverless packages only `.bundle/**`; `dist/` and `node_modules/` are excluded. Do not deploy without running `pnpm bundle` first.

## Email templates

- React Email templates live in `emails/` (e.g. `ResetPassword.tsx`). `tsconfig.json` sets `jsx: react` to support them.
