# Issue: `Cannot find module 'tslib'` on AWS Lambda with pnpm

## Error

```
Error: Cannot find module 'tslib'
Require stack:
- /var/task/node_modules/@nestjs/common/index.js
- /var/task/dist/lambda.js
- /var/runtime/index.mjs
```

## Context

- **Runtime**: AWS Lambda (`nodejs22.x`)
- **Package manager**: pnpm
- **Deployment tool**: Serverless Framework + `serverless-jetpack`

## Root Cause

`tslib` is a transitive runtime dependency of `@nestjs/common` but was not declared as a direct dependency in `package.json`.

pnpm uses a **strict, isolated symlinked `node_modules`** structure. Each package can only resolve modules that are explicitly listed in its own `dependencies`. When `serverless-jetpack` packages the Lambda bundle, `tslib` is only present inside `@nestjs/common`'s dependency subtree and is not accessible from the root — causing the module resolution failure at runtime in Lambda.

### Why it worked with bun

Bun installs packages using a **flat `node_modules`** structure (similar to npm), where transitive dependencies are hoisted to the root `node_modules/`. This makes `tslib` globally accessible, masking the missing explicit dependency declaration.

## Solution

Add `tslib` as an explicit runtime dependency:

```bash
pnpm add tslib
```

This ensures `serverless-jetpack` includes `tslib` at the root of the Lambda package, making it resolvable by `@nestjs/common` at runtime.

### Result in `package.json`

```json
"dependencies": {
  "tslib": "2.8.1",
  ...
}
```

---

## Recurrence: `Cannot find module 'uid'` (May 31, 2026)

### Error

```
Error: Cannot find module 'uid'
Require stack:
- /var/task/node_modules/@nestjs/common/decorators/core/injectable.decorator.js
- /var/task/node_modules/@nestjs/common/decorators/core/index.js
- /var/task/node_modules/@nestjs/common/decorators/index.js
- /var/task/node_modules/@nestjs/common/index.js
- /var/task/dist/lambda.js
- /var/runtime/index.mjs
```

### Root Cause

Same pattern as `tslib`: `uid` is a transitive runtime dependency of `@nestjs/common` that pnpm does not hoist to the root `node_modules/`, so `serverless-jetpack` does not include it in the Lambda bundle.

### Solution

```bash
pnpm add uid
```

### Pattern & Prevention

These errors follow a recurring pattern with pnpm + `serverless-jetpack` deployments: any transitive dependency of `@nestjs/*` packages that is not explicitly declared in `package.json` will be missing from the Lambda bundle.

If this keeps recurring, consider adding a root `.npmrc` with `shamefully-hoist=true` to mimic npm/bun flat hoisting behavior:

```ini
# .npmrc
shamefully-hoist=true
```

This instructs pnpm to hoist all transitive dependencies to the root `node_modules/`, eliminating these missing module errors without needing to manually track each one.
