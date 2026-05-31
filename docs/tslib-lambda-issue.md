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

---

## Permanent Fix: `shamefully-hoist=true` (May 31, 2026)

Instead of manually tracking and adding each missing transitive dependency, the root cause was addressed by configuring pnpm to hoist all packages to the root `node_modules/`, matching the behavior of npm and bun.

### Solution

Created `.npmrc` at the project root:

```ini
shamefully-hoist=true
```

This instructs pnpm to hoist all transitive dependencies to the root `node_modules/`, making them accessible to `serverless-jetpack` during bundling — eliminating the entire class of missing module errors.

### Cleanup

With this fix applied, the previously added workaround dependencies (`tslib`, `uid`) were **removed** from `package.json`. They are not directly imported by this project and were only added as temporary patches. Keeping them would have been phantom dependencies (deps declared but not directly used).

```bash
pnpm remove tslib uid
```

### Why not keep the explicit deps?

| Approach                        | Pros                                    | Cons                                                          |
| ------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Add each missing dep explicitly | No hoisting side effects                | Fragile — any `@nestjs` update can introduce new missing deps |
| `shamefully-hoist=true`         | Permanent fix, matches npm/bun behavior | Slightly looser module isolation                              |

For a Lambda deployment with `serverless-jetpack`, `shamefully-hoist=true` is the correct long-term solution.

> ⚠️ **This fix was later found to be ineffective — see below.**

---

## Investigation: Why hoisting fails in pnpm v11 (May 31, 2026)

After deploying with `shamefully-hoist=true`, the `tslib` error returned. Investigation revealed:

### `shamefully-hoist=true` is ineffective in pnpm v11

Despite being set in `.npmrc`, the setting had no effect — `node_modules/tslib` was never created at the root. Confirmed by:

- `pnpm install --shamefully-hoist` (explicit CLI flag) — still no effect
- `node-linker=hoisted` (modern pnpm v8+ equivalent) — also ignored
- `node_modules/.modules.yaml` always shows `nodeLinker: isolated`

pnpm v11 appears to lock the `nodeLinker` based on the existing lockfile state, and the setting cannot be overridden without deleting both `node_modules` and `pnpm-lock.yaml` (which would change resolved versions and is risky).

### The actual packaging problem

Even if hoisting worked, there is a deeper issue: **`serverless-jetpack` does not correctly handle pnpm's symlinked `node_modules` structure.**

pnpm's module resolution relies on the `.pnpm/` virtual store and symlinks. When `serverless-jetpack` creates the Lambda ZIP:

- It includes `node_modules/@nestjs/common/` (content of the symlink target, resolved)
- But the symlink chain `.pnpm/@nestjs+common@11.x/node_modules/tslib` → `.pnpm/tslib@2.8.1/node_modules/tslib` is either not included or broken

Lambda's Node.js then resolves `require('tslib')` from the real path of `@nestjs/common/index.js`, looks up the directory tree, and finds no `tslib` — because the `.pnpm/` sibling structure that pnpm relies on is missing.

---

## Final Fix: Replace `serverless-jetpack` with `@vercel/ncc` bundling (May 31, 2026)

### Root Cause (definitive)

The entire class of missing module errors is caused by **`serverless-jetpack` being incompatible with pnpm's isolated symlinked `node_modules`**. No amount of hoisting configuration can fix this because the problem is in how `serverless-jetpack` packages dependencies.

### Solution

Replace the `serverless-jetpack` packaging approach with **`@vercel/ncc`**, a bundler that:

1. Takes the compiled `dist/lambda.js` output from `nest build` (preserving tsc's `emitDecoratorMetadata` — required by NestJS)
2. Traces all `require()` calls and bundles everything into a single `index.js`
3. Correctly follows pnpm symlinks at build time (on the developer's machine) — no node_modules needed in Lambda

#### Changes made

**`package.json`**

```bash
pnpm add -D @vercel/ncc
pnpm remove serverless-jetpack
```

New scripts:

```json
"bundle": "ncc build dist/lambda.js -o .bundle --source-map --no-cache",
"deploy": "pnpm run build && pnpm run bundle && sls deploy"
```

**`serverless.yml`**

- Handler changed: `dist/lambda.handler` → `.bundle/index.handler`
- Removed `serverless-jetpack` from plugins
- Added `package.patterns` to include only `.bundle/**` and exclude all source/node_modules

**`.npmrc`**

- Cleared — no hoisting configuration needed since node_modules are no longer shipped to Lambda

#### Deploy pipeline

```
nest build  →  ncc bundle  →  sls deploy
(tsc, ~30s)    (ncc, ~20s)    (upload ~16MB bundle)
```

#### Why ncc and not esbuild?

- **esbuild** is blocked from installing its native binary in this project (`pnpm-workspace.yaml` has `esbuild: false` in `allowBuilds`)
- **ncc** is pure Node.js with no native binary install step, handles CommonJS + code splitting out of the box
