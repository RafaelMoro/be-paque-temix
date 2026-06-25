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
