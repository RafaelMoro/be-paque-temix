# Repository Context - be-paque-temix

**Last Updated:** 2026-06-26

This document describes the architecture, modules, services, guards, and how they connect within the be-paque-temix NestJS backend application.

## Overview

A NestJS-based backend service for shipping/logistics management, integrating with multiple third-party shipping providers (Guia Envia, T1, Pakke, Manuable) to provide quote aggregation and guide generation capabilities.

**Tech Stack:**

- NestJS (Node.js framework)
- MongoDB with Mongoose
- JWT Authentication with Passport
- Serverless deployment (AWS Lambda via Serverless Framework)

---

## Module Architecture

### Core Application Flow

```
AppModule (Root)
├── ConfigModule (Global)
├── DatabaseModule
├── AuthModule
├── UsersModule
├── MailModule
└── Feature Modules
    ├── QuotesModule (aggregates shipping quotes)
    ├── GuidesModule (creates shipping guides)
    ├── BalanceModule (user wallet and balance requests)
    ├── AddressesModule (manages user addresses)
    ├── GlobalConfigsModule (system configuration)
    └── Provider Integration Modules
        ├── GuiaEnviaModule
        ├── T1Module
        ├── PakkeModule
        └── ManuableModule
```

---

## Module Details

### 1. **AppModule** (`src/app.module.ts`)

**Root module** that imports all feature modules and applies global middleware.

**Imports:**

- ConfigModule (global configuration with Joi validation)
- DatabaseModule
- All feature and provider modules

**Middleware:**

- `LoggedMiddleware` - Applied to all routes (`*`), extracts JWT from cookies and adds to Authorization header

**Controllers:** `AppController`
**Providers:** `AppService`

---

### 2. **DatabaseModule** (`src/database/database.module.ts`)

Configures MongoDB connection using Mongoose.

**Purpose:** Centralized database connection setup
**Connection String:** Built from environment variables (cluster, user, password)

---

### 3. **AuthModule** (`src/auth/auth.module.ts`)

Handles authentication and authorization.

**Imports:**

- `UsersModule` (to validate user credentials)
- `PassportModule`
- `JwtModule` (configured with JWT_KEY and expiration time)

**Providers:**

- `AuthService` - Authentication logic (login, token generation)
- `LocalStrategy` - Passport local strategy for username/password auth
- `JwtStrategy` - Passport JWT strategy for token validation

**Controllers:** `AuthController`

**Guards:**

- `JwtGuard` (`src/auth/guards/jwt-guard/jwt-guard.guard.ts`) - Validates JWT tokens, respects `@Public()` decorator
- `RolesGuard` (`src/auth/guards/roles/roles.guard.ts`) - Role-based access control, validates user roles against `@Roles()` decorator

**Decorators:**

- `@Public()` - Marks endpoints as publicly accessible (bypasses JWT validation)
- `@Roles(...roles)` - Requires specific user roles (e.g., `@Roles('admin')`)

**Strategies:**

- `JWT_STRATEGY` constant defines the strategy name for JWT authentication

---

### 4. **UsersModule** (`src/users/users.module.ts`)

User management and persistence.

**Imports:**

- `MongooseModule.forFeature([User])` - User entity/schema
- `JwtModule` (separate instance for one-time tokens)
- `MailModule` (for sending emails)

**Providers:** `UsersService`
**Exports:** `UsersService` (used by AuthModule)
**Controllers:** `UsersController` (route: `/users`)

**Entity:** `User` with `UsersSchema`

---

### 5. **MailModule** (`src/mail/mail.module.ts`)

Email sending capabilities (using Resend API).

**Providers:** `MailService`
**Exports:** `MailService`
**Used by:** UsersModule (password reset, etc.)

---

### 6. **QuotesModule** (`src/quotes/quotes.module.ts`)

**Purpose:** Aggregates shipping quotes from multiple providers

**Imports:**

- `GuiaEnviaModule`
- `T1Module`
- `PakkeModule`
- `ManuableModule`
- `GlobalConfigsModule`

**Providers:** `QuotesService` - Calls all provider services and aggregates results
**Controllers:** `QuotesController` (route: `/quotes`, protected by `@UseGuards(JwtGuard)`)

**Flow:**

1. Client requests quote
2. `QuotesService` queries all enabled providers (based on `GlobalConfigs`)
3. Aggregates responses and returns unified quote data

---

### 7. **GuidesModule** (`src/guides/guides.module.ts`)

**Purpose:** Creates shipping guides with selected providers

**Imports:**

- `GuiaEnviaModule`
- `T1Module`
- `PakkeModule`
- `ManuableModule`

**Providers:** `GuidesService` - Orchestrates guide creation with specific provider
**Controllers:** `GuidesController` (route: `/guides`)

**Sub-modules:**
- `GuidesDbModule` - Database-persisted guide tracking with full CRUD

**GuidesDbController** (route: `/guides/db`):
- `POST /guides/db/create` - Create guide with database persistence
- `GET /guides/db` - Get user's guides (paginated)
- `GET /guides/db/admin` - Admin: get all guides with filters (admin only)
- `GET /guides/db/:guideId` - Get single guide detail
- `POST /guides/db/:guideId/retry` - Retry a failed guide
- `POST /guides/db/:guideId/sync` - Sync guide status with provider (GE only)
- `POST /guides/db/:guideId/comments` - Add admin comment (admin only)
- `PATCH /guides/db/:guideId/status` - Update guide status (admin only)
- `DELETE /guides/db/:guideId` - Soft delete a guide
- `DELETE /guides/db/:guideId/hard` - Permanently delete guide (admin only)

**GuidesDbService**:
- `generateKraftId()` - Generates sequential kraftId (e.g., KFT-202606-000001)
- `createGuide()` - Creates guide, calls provider API, persists result
- `getGuidesByUser()` - Paginated user guide listing
- `getAllGuides()` - Admin paginated listing with month/user filters
- `getGuideById()` - Single guide retrieval
- `checkRetryEligibility()` - Checks 10-attempt limit and 5-min cooldown
- `retryFailedGuide()` - Re-calls provider API for failed guides
- `syncGuideWithProvider()` - Fetches current status from provider
- `addComment()` - Adds admin comment to guide
- `updateGuideStatus()` - Updates guide status manually
- `softDeleteGuide()` - Soft deletes guide (sets deletedAt, deletedBy)
- `hardDeleteGuide()` - Permanently deletes guide

---

### 8. **AddressesModule** (`src/addresses/addresses.module.ts`)

**Purpose:** Manages user shipping addresses

**Imports:** `MongooseModule.forFeature([AddressDoc])`
**Providers:** `AddressesService`
**Controllers:** `AddressesController` (route: `/addresses`)
**Entity:** `AddressDoc` with `AddressSchema`

---

### 9. **BalanceModule** (`src/balance/balance.module.ts`)

**Purpose:** Maintains per-user wallets and balance funding requests.

**Imports:** `UsersModule`, `MailModule`, and Mongoose models for `Balance` and `BalanceRequest`.
**Providers:** `BalanceService` (exported for persisted guide creation)
**Controllers:** `BalanceController` (route: `/balance`, protected by `JwtGuard`)

**Key Features:**

- Wallet values and requests are stored as integer cents; absent wallets read as zero.
- Users can create, list, and cancel pending requests, and read their own balance.
- Admin decisions use an atomic request-transition and wallet-credit transaction.
- Request-created and decision emails are best-effort notifications.
- Only persisted guide creation is balance-gated; mock guide creation bypasses the wallet.

---

### 10. **GlobalConfigsModule** (`src/global-configs/global-configs.module.ts`)

**Purpose:** System-wide configuration, feature flags, and profit margin management

**Imports:** `MongooseModule.forFeature([GlobalConfigs])`
**Providers:** `GlobalConfigsService` (implements `OnModuleInit` - loads config on startup)
**Exports:** `GlobalConfigsService`
**Controllers:** `GlobalConfigsController` (route: `/global-configs`, **admin-only access**)
**Entity:** `GlobalConfigs` with `GlobalConfigsSchema`

**Key Features:**

- Controls which shipping providers are enabled/disabled
- **Profit Margin Management:** Manages profit margins for each provider
  - Supports percentage-based margins (e.g., 10% markup)
  - Supports absolute/fixed margins (e.g., $5.00 flat fee)
  - Update and retrieval operations
- **Access Control:** Admin users only (protected by `JwtGuard` + `RolesGuard`)

---

## Provider Integration Modules

These modules integrate with external shipping provider APIs.

### 10. **GuiaEnviaModule** (`src/guia-envia/guia-envia.module.ts`)

**External API:** Guia Envia shipping service
**Providers:** `GuiaEnviaService`
**Exports:** `GuiaEnviaService`
**Controllers:** `GuiaEnviaController` (route: `/ge`)

---

### 11. **T1Module** (`src/t1/t1.module.ts`)

**External API:** T1 shipping service (requires token management)

**Imports:**

- `GeneralInfoDbModule` (stores provider metadata)
- `TokenManagerModule` (manages OAuth tokens)

**Providers:** `T1Service`
**Exports:** `T1Service`
**Controllers:** `T1Controller` (route: `/tone`)

---

### 12. **PakkeModule** (`src/pakke/pakke.module.ts`)

**External API:** Pakke shipping service
**Providers:** `PakkeService`
**Exports:** `PakkeService`
**Controllers:** `PakkeController` (route: `/pkk`)

---

### 13. **ManuableModule** (`src/manuable/manuable.module.ts`)

**External API:** Manuable shipping service (requires token management)

**Imports:**

- `GeneralInfoDbModule`
- `TokenManagerModule`

**Providers:** `ManuableService`
**Exports:** `ManuableService`
**Controllers:** `ManuableController` (route: `/mn`)

---

## Supporting Modules

### 14. **TokenManagerModule** (`src/token-manager/token-manager.module.ts`)

**Purpose:** Intelligent OAuth/API token management with automatic retry and refresh logic

**Providers:** `TokenManagerService`
**Exports:** `TokenManagerService`
**Used by:** T1Module, ManuableModule

**Key Features:**

- **Token Expiration Handling:** Detects unauthorized (401) errors from provider APIs
- **Automatic Retry Logic:**
  1. Intercepts API call failures due to expired tokens
  2. Determines if error is token-related (401/403)
  3. Requests new token from provider
  4. Updates token in `GeneralInfoDbService`
  5. Retries original API call with fresh token
- **Transparent Operation:** Other modules don't need to handle token refresh explicitly

---

### 15. **GeneralInfoDbModule** (`src/general-info-db/general-info-db.module.ts`)

**Purpose:** Persistent storage for provider tokens and metadata

**Imports:** `MongooseModule.forFeature([GeneralInfoDb])`
**Providers:** `GeneralInfoDbService`
**Exports:** `GeneralInfoDbService`
**Entity:** `GeneralInfoDb` with `GeneralInfoDbSchema`
**Used by:** T1Module, ManuableModule

**Key Features:**

- **Token Storage:** Stores OAuth/API tokens for Manuable (Mn) and T1 (TONE)
- **Token Retrieval:** Provides current tokens to provider services
- **Token Updates:** Persists refreshed tokens from `TokenManagerService`
- **Metadata Management:** Stores additional provider-specific configuration and state

---

## Guards and Authentication Flow

### JwtGuard (`src/auth/guards/jwt-guard/jwt-guard.guard.ts`)

**Extends:** `AuthGuard(JWT_STRATEGY)` from Passport
**Purpose:** Validates JWT tokens on protected routes

**Logic:**

1. Checks if route/controller has `@Public()` decorator → allows access
2. Otherwise, delegates to Passport JWT strategy
3. JWT extracted from `Authorization: Bearer <token>` header

**Usage:**

```typescript
@UseGuards(JwtGuard)
@Controller('quotes')
export class QuotesController { ... }
```

---

### RolesGuard (`src/auth/guards/roles/roles.guard.ts`)

**Purpose:** Role-based access control (RBAC)

**Logic:**

1. Extracts required roles from `@Roles()` decorator metadata
2. If no roles required → allows access
3. Checks if authenticated user has ALL required roles
4. User roles can be a single role or array

**Usage:**

```typescript
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin', 'manager')
@Get('sensitive-data')
getSensitiveData() { ... }
```

**Note:** `RolesGuard` should be used **after** `JwtGuard` to ensure user is authenticated first.

---

## Middleware

### LoggedMiddleware (`src/middlewares/LoggedMiddleware.middleware.ts`)

**Applied to:** All routes (`*`)
**Purpose:** Converts cookie-based authentication to header-based

**Logic:**

1. Checks for `accessToken` in cookies
2. If found, adds `Authorization: Bearer <token>` header
3. Continues to next middleware/handler

**Why:** Allows clients to authenticate via cookies while NestJS guards expect header-based JWT

---

## Service Dependencies

### Service Interaction Map

```
QuotesService
├─→ GuiaEnviaService (external API call)
├─→ T1Service
│   ├─→ GeneralInfoDbService (token retrieval)
│   └─→ TokenManagerService (token validation, retry on expiration)
│       └─→ GeneralInfoDbService (token updates)
├─→ PakkeService (external API call)
├─→ ManuableService
│   ├─→ GeneralInfoDbService (token retrieval)
│   └─→ TokenManagerService (token validation, retry on expiration)
│       └─→ GeneralInfoDbService (token updates)
└─→ GlobalConfigsService (check enabled providers, get profit margins)

GuidesService
├─→ GuiaEnviaService
├─→ T1Service
├─→ PakkeService
└─→ ManuableService

GuidesDbService
└─→ BalanceService (wallet check and guarded debit for persisted guide creation)

BalanceService
├─→ UsersService (admin notification recipients)
└─→ MailService (balance-request notifications)

UsersService
└─→ MailService (send emails)

AuthService
└─→ UsersService (validate credentials, fetch user)
```

---

## Controllers and API Routes

| Controller                | Route             | Guards                                   | Purpose                                |
| ------------------------- | ----------------- | ---------------------------------------- | -------------------------------------- |
| `AppController`           | `/`               | None                                     | Health check, root endpoint            |
| `AuthController`          | `/auth`           | Mixed                                    | Login, register, token refresh         |
| `UsersController`         | `/users`          | `JwtGuard`                               | User CRUD operations                   |
| `QuotesController`        | `/quotes`         | `JwtGuard`                               | Get shipping quotes from all providers |
| `GuidesController`        | `/guides`         | `JwtGuard`                               | Create shipping guides                 |
| `GuidesDbController`      | `/guides/db`      | `JwtGuard`                               | DB-persisted guides with retry/sync    |
| `AddressesController`     | `/addresses`      | `JwtGuard`                               | Manage user addresses                  |
| `BalanceController`       | `/balance`        | `JwtGuard`, admin routes add `RolesGuard` | User wallet and balance requests      |
| `GlobalConfigsController` | `/global-configs` | `JwtGuard` + `RolesGuard` (likely admin) | System configuration                   |
| `GuiaEnviaController`     | `/ge`             | `JwtGuard`                               | Direct Guia Envia API access           |
| `T1Controller`            | `/tone`           | `JwtGuard`                               | Direct T1 API access                   |
| `PakkeController`         | `/pkk`            | `JwtGuard`                               | Direct Pakke API access                |
| `ManuableController`      | `/mn`             | `JwtGuard`                               | Direct Manuable API access             |

---

## External API Integrations

### Provider Services Pattern

All provider services follow a similar pattern:

1. **Configuration:** Environment variables for API keys, URIs, credentials
2. **Authentication:** Some providers (T1, Manuable) require OAuth token management
3. **Endpoints:**
   - Get shipping quotes (rates/prices)
   - Create shipping guides (labels)
   - Get address information
4. **Error Handling:** Wrapped in try/catch, logged and re-thrown
5. **Data Transformation:** External API responses → internal DTOs

### Token Management (T1 & Manuable)

**Automatic Retry Flow with TokenManagerService:**

1. T1Service or ManuableService makes API request to external provider
2. If request fails with 401/403 (unauthorized):
   - `TokenManagerService` detects token expiration
   - Automatically requests new token from provider's OAuth endpoint
   - Updates token in `GeneralInfoDbService` (persisted to MongoDB)
   - Retries original API call with fresh token
3. If request succeeds, response is returned normally
4. Token is cached and reused until next expiration

**Benefits:**

- Services don't need explicit token refresh logic
- Transparent to calling code (QuotesService, GuidesService)
- Handles race conditions when multiple requests expire simultaneously
- Persistent token storage survives Lambda cold starts

---

## Database Collections

| Collection      | Module              | Purpose                                                      |
| --------------- | ------------------- | ------------------------------------------------------------ |
| `users`         | UsersModule         | User accounts, credentials, roles                            |
| `addresses`     | AddressesModule     | User shipping addresses                                      |
| `globalconfigs` | GlobalConfigsModule | System configuration, feature flags, provider profit margins |
| `generalinfodb` | GeneralInfoDbModule | OAuth tokens for T1 and Manuable, provider metadata          |
| `balances`      | BalanceModule       | Per-user wallet amounts stored as integer cents               |
| `balance_requests` | BalanceModule    | Pending and decided balance funding requests                  |

---

## Configuration (Environment Variables)

Managed by `ConfigModule` with Joi validation in `src/app.module.ts`.

**Required Variables:**

- `MONGO_*` - Database connection
- `JWT_KEY`, `ONE_TIME_JWT_KEY`, `PUBLIC_KEY`, `ROLE_KEY` - Auth configuration
- `RESEND_API_KEY`, `MAILER_MAIL` - Email service
- `GUIA_ENVIA_KEY`, `GUIA_ENVIA_*` - Guia Envia API
- `T1_*` - T1 API credentials and endpoints
- `PAKKE_KEY`, `PAKKE_URI` - Pakke API
- `MANUABLE_*` - Manuable API credentials
- `FRONTEND_URI`, `FRONTEND_PORT` - CORS/redirect configuration

**Config Object:** `src/config.ts` exports typed configuration

---

## Common Patterns

### 1. **Module Export Pattern**

Modules that provide services export them for other modules to import:

```typescript
@Module({
  providers: [MyService],
  exports: [MyService], // ← Makes service available to other modules
})
```

### 2. **Guard Stacking**

Multiple guards can be applied in order:

```typescript
@UseGuards(JwtGuard, RolesGuard) // ← JwtGuard first, then RolesGuard
```

### 3. **Decorator Composition**

Custom decorators use `SetMetadata` to mark routes:

- `@Public()` - Skips authentication
- `@Roles(...)` - Requires specific roles

### 4. **Provider Aggregation**

`QuotesModule` and `GuidesModule` aggregate multiple provider services to provide unified functionality.

---

## Testing Structure

- **Unit Tests:** `*.spec.ts` files co-located with source files
- **E2E Tests:** `test/app.e2e-spec.ts`
- **Test Coverage:** Reports generated in `coverage/` directory

---

## Deployment

- **Serverless Framework:** `serverless.yml` configuration
- **Target:** AWS Lambda
- **Entry Point:** `lambda.ts` wraps NestJS app for Lambda

---

## Adding New Modules (Guidelines)

When adding new modules to this codebase:

1. **Create module structure:**

   ```
   src/my-feature/
   ├── my-feature.module.ts
   ├── controllers/
   │   └── my-feature.controller.ts
   ├── services/
   │   └── my-feature.service.ts
   ├── entities/ (if using database)
   │   └── my-feature.entity.ts
   ├── dtos/
   │   └── my-feature.dto.ts
   └── guards/ (if custom guards needed)
   ```

2. **Import in AppModule:** Add to `imports` array in `src/app.module.ts`

3. **Apply guards:** Use `@UseGuards(JwtGuard)` on controllers or routes that require authentication

4. **Export services:** If other modules need to use the service, add to `exports` array

5. **Update this document:** Add module details, update dependency graph

---

## Key Files Reference

| File                                        | Purpose                                                      |
| ------------------------------------------- | ------------------------------------------------------------ |
| `src/main.ts`                               | Application entry point, Swagger setup, global pipes/filters |
| `src/config.ts`                             | Typed configuration object                                   |
| `src/app.constant.ts`                       | Application-wide constants                                   |
| `src/global.interface.ts`                   | Shared TypeScript interfaces                                 |
| `src/express.d.ts`                          | Express type extensions                                      |
| `src/exceptions/GeneralException.filter.ts` | Global exception filter                                      |

---

## Notes

- **JWT Strategy Name:** Defined by `JWT_STRATEGY` constant in `src/auth/auth.constant.ts`
- **Cookie-to-Header Conversion:** Handled by `LoggedMiddleware` globally
- **Public Routes:** Use `@Public()` decorator to bypass JWT authentication
- **Role-Based Access:** Use `@Roles()` decorator with `RolesGuard`
- **Admin-Only Features:** Global configs (profit margins) require admin role
- **Profit Margins:** Configured per provider in GlobalConfigs (percentage or absolute values)
- **Token Refresh:** Automatic retry logic in `TokenManagerService` handles expired tokens transparently
- **Provider Integration:** All provider services follow similar patterns for maintainability
- **Serverless Considerations:** Lambda-compatible design (stateless, environment-based config), tokens persisted to MongoDB
