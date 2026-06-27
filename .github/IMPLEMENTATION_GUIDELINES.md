# Implementation Guidelines

**Last Updated:** 2026-06-14

This document provides technical guidelines and patterns for implementing features in the be-paque-temix codebase. Follow these conventions to maintain consistency and quality.

---

## Table of Contents

- [NestJS Module Creation](#nestjs-module-creation)
- [Service Creation](#service-creation)
- [Controller Creation](#controller-creation)
- [Module Dependencies and Exports](#module-dependencies-and-exports)
- [File Organization](#file-organization)
- [Testing Conventions](#testing-conventions)

---

## NestJS Module Creation

### Creating a New Module

Use the NestJS CLI to generate modules:

```bash
nest g mo <moduleName>
```

**Important:**
- During the **planning phase**, confirm the module name with the user before implementation
- Module names should be singular (e.g., `user`, `quote`, `address`)
- The CLI will automatically:
  - Create `src/<module-name>/<module-name>.module.ts`
  - Import the module in `AppModule`

**Example:**
```bash
nest g mo order
# Creates: src/order/order.module.ts
# Updates: src/app.module.ts (adds OrderModule to imports)
```

### Module Structure

Once created, organize the module with this structure:

```
src/<module-name>/
├── <module-name>.module.ts
├── <module-name>.constants.ts (if needed)
├── <module-name>.interface.ts (if needed)
├── <module-name>.utils.ts (if needed)
├── controllers/
│   └── <module-name>.controller.ts
├── services/
│   ├── <module-name>.service.ts
│   └── <module-name>.service.spec.ts
├── entities/
│   └── <module-name>.entity.ts (if using database)
├── dtos/
│   ├── <module-name>.dto.ts (request DTOs)
│   └── <module-name>-responses.dto.ts (response DTOs)
└── guards/ (if custom guards needed)
```

---

## Service Creation

### Creating a Service

Use the NestJS CLI to generate services within a module:

```bash
nest g s <module-name>/<serviceName>
```

**Example:**
```bash
nest g s order/order
# Creates: src/order/services/order.service.ts
# Creates: src/order/services/order.service.spec.ts
# Updates: src/order/order.module.ts (adds OrderService to providers)
```

**Notes:**
- Service files are automatically added to the `providers` array in the module
- Test files (`.spec.ts`) are created automatically
- Services should be placed in the `services/` subdirectory

---

## Controller Creation

### Creating a Controller

Use the NestJS CLI to generate controllers:

```bash
nest g co <module-name>/<controllerName>
```

**Example:**
```bash
nest g co order/order
# Creates: src/order/controllers/order.controller.ts
# Creates: src/order/controllers/order.controller.spec.ts
# Updates: src/order/order.module.ts (adds OrderController to controllers)
```

**Notes:**
- Controllers are automatically added to the `controllers` array in the module
- Place controllers in the `controllers/` subdirectory
- Use route prefixes that match the module name (e.g., `@Controller('orders')`)
- **Controllers must stay thin**: no direct service orchestration, no business logic, and no conditional logic beyond extracting the authenticated user from the request. Pass the raw request user to the service and let the service own all decisions.

---

## Module Dependencies and Exports

### Exporting Services for Use in Other Modules

When a service needs to be used by other modules, **export** it from its module:

**Pattern:**
```typescript
import { Module } from '@nestjs/common';
import { MyService } from './services/my.service';

@Module({
  providers: [MyService],
  exports: [MyService], // ← Makes service available to other modules
})
export class MyModule {}
```

**Example: TokenManagerModule**
```typescript
import { Module } from '@nestjs/common';
import { TokenManagerService } from './services/token-manager.service';

@Module({
  providers: [TokenManagerService],
  exports: [TokenManagerService], // ← Other modules can use this service
})
export class TokenManagerModule {}
```

### Importing Services from Other Modules

To use a service from another module, **import the module** (not the service directly):

**Pattern:**
```typescript
import { Module } from '@nestjs/common';
import { MyService } from './services/my.service';
import { MyController } from './controllers/my.controller';
import { OtherModule } from '@/other-module/other-module.module'; // ← Import the MODULE

@Module({
  imports: [OtherModule], // ← Import module, not service
  providers: [MyService],
  controllers: [MyController],
  exports: [MyService],
})
export class MyModule {}
```

**Example: T1Module importing TokenManagerModule and GeneralInfoDbModule**
```typescript
import { Module } from '@nestjs/common';
import { T1Service } from './services/t1.service';
import { GeneralInfoDbModule } from '@/general-info-db/general-info-db.module';
import { TokenManagerModule } from '@/token-manager/token-manager.module';
import { T1Controller } from './controllers/t1.controller';

@Module({
  imports: [GeneralInfoDbModule, TokenManagerModule], // ← Import modules
  providers: [T1Service], // ← T1Service can now inject GeneralInfoDbService and TokenManagerService
  exports: [T1Service],
  controllers: [T1Controller],
})
export class T1Module {}
```

**Key Points:**
- Always import the **module**, not individual services
- The imported module must **export** the service you want to use
- Services are injected via constructor in the consuming service:
  ```typescript
  constructor(
    private readonly tokenManagerService: TokenManagerService,
    private readonly generalInfoDbService: GeneralInfoDbService,
  ) {}
  ```

---

## File Organization

### Path Aliases

Use the `@/` alias for imports to reference from the `src/` root:

```typescript
// ✓ Good
import { TokenManagerService } from '@/token-manager/services/token-manager.service';
import config from '@/config';

// ✗ Avoid
import { TokenManagerService } from '../../../token-manager/services/token-manager.service';
```

### File Naming Conventions

- **Modules:** `<module-name>.module.ts` (singular, kebab-case)
- **Services:** `<service-name>.service.ts`
- **Controllers:** `<controller-name>.controller.ts`
- **Entities:** `<entity-name>.entity.ts`
- **DTOs:** `<dto-name>.dto.ts` or `<module>-responses.dto.ts`
- **Tests:** `<file-name>.spec.ts` (co-located with source file)
- **Constants:** `<module-name>.constants.ts`
- **Interfaces:** `<module-name>.interface.ts`
- **Utils:** `<module-name>.utils.ts`

---

## Testing Conventions

### Test File Location

- Place test files alongside source files with `.spec.ts` extension
- NestJS CLI automatically creates test files when generating services/controllers

### Test Structure

Follow this pattern for service tests:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Additional tests...
});
```

### Mocking External Dependencies

When testing services that depend on other services:

```typescript
const mockTokenManagerService = {
  getToken: jest.fn(),
  refreshToken: jest.fn(),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      T1Service,
      {
        provide: TokenManagerService,
        useValue: mockTokenManagerService,
      },
    ],
  }).compile();

  service = module.get<T1Service>(T1Service);
});
```

### Console Output in Tests

Silence console logs during tests unless asserting errors:

```typescript
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

---

## Database Integration

### Adding MongoDB Entities

When a module needs database persistence:

1. **Create entity file** in `entities/` directory:
   ```typescript
   import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
   import { HydratedDocument } from 'mongoose';

   export type MyEntityDocument = HydratedDocument<MyEntity>;

   @Schema()
   export class MyEntity {
     @Prop({ required: true })
     name: string;
   }

   export const MyEntitySchema = SchemaFactory.createForClass(MyEntity);
   ```

2. **Import in module**:
   ```typescript
   import { MongooseModule } from '@nestjs/mongoose';
   import { MyEntity, MyEntitySchema } from './entities/my-entity.entity';

   @Module({
     imports: [
       MongooseModule.forFeature([
         {
           name: MyEntity.name,
           schema: MyEntitySchema,
         },
       ]),
     ],
     providers: [MyService],
     controllers: [MyController],
   })
   export class MyModule {}
   ```

3. **Inject in service**:
   ```typescript
   import { InjectModel } from '@nestjs/mongoose';
   import { Model } from 'mongoose';
   import { MyEntity, MyEntityDocument } from '../entities/my-entity.entity';

   @Injectable()
   export class MyService {
     constructor(
       @InjectModel(MyEntity.name)
       private myEntityModel: Model<MyEntityDocument>,
     ) {}
   }
   ```

---

## Authentication and Guards

### Applying JwtGuard

Protect routes with JWT authentication:

**Controller-level:**
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';

@UseGuards(JwtGuard) // ← Applies to all routes in controller
@Controller('orders')
export class OrdersController {
  // All routes require JWT
}
```

**Route-level:**
```typescript
@UseGuards(JwtGuard) // ← Applies to single route
@Get(':id')
getOrder(@Param('id') id: string) {
  // Route requires JWT
}
```

### Public Routes

Use `@Public()` decorator to bypass JWT:

```typescript
import { Public } from '@/auth/decorators/public/public.decorator';

@Public()
@Get('public-info')
getPublicInfo() {
  // No JWT required
}
```

### Role-Based Access

Use `@Roles()` decorator with `RolesGuard`:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import { Roles } from '@/auth/decorators/roles/roles.decorator';

@UseGuards(JwtGuard, RolesGuard) // ← JwtGuard MUST come first
@Roles('admin') // ← Requires 'admin' role
@Controller('global-configs')
export class GlobalConfigsController {
  // Admin-only routes
}
```

---

## Environment Configuration

### Using Config Service

Access environment variables via typed config:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import config from '@/config';

@Injectable()
export class MyService {
  constructor(
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
  ) {}

  someMethod() {
    const apiKey = this.configService.providers.myProvider.apiKey;
  }
}
```

### Adding New Environment Variables

1. **Add to `.env` file**
2. **Add Joi validation** in `src/app.module.ts`:
   ```typescript
   ConfigModule.forRoot({
     validationSchema: Joi.object({
       // ... existing vars
       MY_NEW_VAR: Joi.string().required(),
     }),
   }),
   ```
3. **Add to config object** in `src/config.ts`

---

## DTOs Are the Source of Truth — Derive Types, Don't Duplicate

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

---

## Error Handling — Never Return 500 Internal Server Error

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

---

## Service Return Shape — Always Return A Response Envelope

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
    address: {
      alias: address.alias,
    },
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
      data: {
        <entity>: { id: entity.id }, // or kraftId, alias, etc.
      },
    };
  } catch (error) {
    if (error instanceof KraftError) throw error;
    throw new KraftError(
      CONST.MY_ERROR_CODE,
      'Failed to delete <entity>',
      error,
    );
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

---

## Next Steps

As new patterns emerge or existing patterns evolve, update this document to reflect best practices.

**When to update this document:**
- New module patterns are established
- Common implementation mistakes are identified
- Architecture decisions affect implementation approach
- New conventions are agreed upon

**Related Documents:**
- [REPO_CONTEXT.md](./REPO_CONTEXT.md) - Current codebase architecture
- [copilot-instructions.md](./copilot-instructions.md) - Code quality standards
