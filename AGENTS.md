# Agent Notes — Kraft Envios API

## Toolchain (trust the lockfile, not the README)

- Use **pnpm**, not Bun. The repo has `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `engines` requiring `node >=22.16.0` and `pnpm >=10.11.1`.
- `pnpm install` is the correct first step.

## Environment

- Copy `.env-example` to `.env.local` and fill **all** values. The app validates env vars via Joi in `src/app.module.ts` on every bootstrap, so a missing key crashes startup.
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

- Local dev: `src/main.ts` → loads `.env.local` with `process.loadEnvFile()`, listens on `PORT` (default 3000).
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

## Error handling — never return 500 Internal Server Error

All service methods that perform async operations (database, external API calls) **must** wrap their logic in try-catch. Errors must be converted to `KraftError` (or re-thrown as-is if already a `KraftError`). Unhandled exceptions propagate to NestJS and return a raw 500 to the client, which leaks internals and is unhelpful.

**Pattern — every async service method:**
```typescript
async myServiceMethod(args): Promise<SomeDto> {
  try {
    // business logic
    return result;
  } catch (error) {
    if (error instanceof KraftError) throw error;
    throw new KraftError(
      CONST.MY_ERROR_CODE,
      'Human-readable message',
      error,
    );
  }
}
```

**Why this matters:**
- Clients receive structured `{ code, message, technicalDetails }` responses instead of 500
- Error codes map to specific user-facing remediation messages
- Technical details (original error, stack) are preserved for debugging but not leaked

**Already applied in:** all guides-db service methods. When adding new service methods, always use this pattern.

## Service return shape — always return a response envelope

Service methods (including delete/mutate operations) must return a structured response envelope — never `void`. The envelope matches the global `GeneralResponse` shape:

```typescript
{
  version: string;
  data: { <entity>: { ...payload } };
  message: string | null;
  error: string | object | null;
}
```

**Reference pattern — `addresses.service.ts:156-165` (deleteAddressByAliasAndEmail):**
```typescript
return {
  version: npmVersion,
  message: null,
  error: null,
  data: {
    address: { alias: address.alias },
  },
};
```

**Pattern — every mutating service method:**
```typescript
async deleteSomething(id: string): Promise<DeleteResponseDto> {
  try {
    const npmVersion: string = this.configService.version!;
    const entity = await this.findEntity(id);
    await this.entityModel.findByIdAndDelete(entity._id);
    return {
      version: npmVersion,
      message: null,
      error: null,
      data: { <entity>: { id: entity.id } },
    };
  } catch (error) {
    if (error instanceof KraftError) throw error;
    throw new KraftError(CONST.MY_ERROR_CODE, 'Failed to delete <entity>', error);
  }
}
```

**Why this matters:**
- Clients get a consistent response shape across all endpoints (create, read, update, delete)
- Returning `void` from a delete operation skips the response envelope — inconsistent with the rest of the API
- The wrapper gives clients confirmation of what was deleted (e.g. the deleted `kraftId`)

**Where to apply:**
- `softDeleteGuide`, `hardDeleteGuide` (and any future delete/mutate methods) — see `src/guides/services/guides-db.service.ts:336-387`

**Already applied in:**
- `src/addresses/services/addresses.service.ts:156-165` — `deleteAddressByAliasAndEmail`
- `src/guides/services/guides-db.service.ts` — `softDeleteGuide`, `hardDeleteGuide`

## Code style

- Prettier: `singleQuote: true`, `trailingComma: all`.
- ESLint: `typescript-eslint/recommendedTypeChecked`, explicit `any` allowed, `@typescript-eslint/no-floating-promises` is a warning.
- Path alias `@/*` resolves to `src/*`.

## Deployment

- Target: AWS Lambda `nodejs22.x` in `us-east-1`, API Gateway.
- Serverless packages only `.bundle/**`; `dist/` and `node_modules/` are excluded. Do not deploy without running `pnpm bundle` first.

## Code references with line ranges

- When the user gives a reference like `@path:start-end`, prefer `sed -n 'start,endp' path` via Bash over the Read tool. This reads only the requested lines and is cheaper than Read's offset/limit path. (`sed -n '565,575p' src/...service.ts`)
- For `@path` with no line numbers, keep using Read (whole-file context is the point).

## Email templates

- React Email templates live in `emails/` (e.g. `ResetPassword.tsx`). `tsconfig.json` sets `jsx: react` to support them.

## DTOs are the source of truth — derive types, don't duplicate

**Rule:** When a service or interface needs a type that mirrors a response DTO, do **not** create a parallel interface. Instead, use a type alias that extends the DTO class.

**Pattern:**
```typescript
// In dtos/responses.dto.ts
export class GuideDataDto {
  @ApiProperty()
  kraftId: string;
  // ... other fields
}

// In <module>.interface.ts — derive a type from the DTO
import { GuideDataDto } from './dtos/responses.dto';
export type FormattedGuideData = GuideDataDto;

// In <module>.entity.ts — same pattern for entities
export type GuideDoc = Guide;
```

**Why:**
- DTOs already carry `@ApiProperty` metadata, class-validator decorators, and the canonical response shape.
- Parallel interfaces drift over time — adding a field to the DTO requires also updating the interface.
- TypeScript catches mismatches at compile time when service code assigns to the DTO-derived type.

**Where to apply:**
- Any `<module>.interface.ts` that defines a type mirroring a DTO.
- Any service method that constructs a response object — type the literal with the DTO-derived alias so missing/extra fields fail the build.
- Same pattern applies to entities: `export type XxxDoc = Xxx;` (see `src/guides/entities/guide.entity.ts:149`).

**Already applied in:**
- `src/guides/guides.interface.ts` — `FormattedGuideData = GuideDataDto`
- `src/guides/entities/guide.entity.ts` — `GuideDoc = Guide`
