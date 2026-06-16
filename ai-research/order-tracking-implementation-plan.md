# Guide Tracking Database - Technical Implementation Plan

## Document Overview

This document provides the complete technical implementation plan for the Guide Tracking Database system. It translates the research findings into concrete, actionable implementation steps.

**Based on**: [Guide Tracking Database Research](./order-tracking-database-research.md)

**Last Updated**: 2026-06-15

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Database Schema Definition](#database-schema-definition)
3. [API Endpoints Specification](#api-endpoints-specification)
4. [Service Layer Architecture](#service-layer-architecture)
5. [Error Handling Implementation](#error-handling-implementation)
6. [Implementation Phases](#implementation-phases)
7. [Task Breakdown](#task-breakdown)
8. [Testing Strategy](#testing-strategy)
9. [Success Criteria](#success-criteria)

---

## Implementation Overview

### Objectives

Transform the guides system from an API proxy to a database-first application where:

- Database is the source of truth for guide data
- External provider APIs are execution mechanisms
- System is resilient to provider failures
- Full audit trail and retry capability
- Dual tracking reference system (kraftId + externalId)

### Key Principles

1. **KraftId First**: Always generate before provider calls
2. **Always Persist**: Save guides regardless of API success/failure
3. **User Isolation**: Strict data access control
4. **Provider Agnostic**: Standardized payload across all 4 providers
5. **Dual Tracking**: kraftId (permanent) + externalId (reference)

### Technology Stack

- **Framework**: NestJS
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with role-based access
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI

---

## Database Schema Definition

### Guide Entity Schema

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Embedded sub-schemas
@Schema({ _id: false })
class Address {
  // Note: Fields are optional because different providers require different fields
  // Pakke: name, email, phone, street1, isResidential, neighborhood, city, state, zipcode (company optional for origin, required for destination)
  // T1: name, lastName, street1, neighborhood, external_number, town, state, phone, email, reference
  // Manuable: name, street1, neighborhood, external_number, city, company, state, phone, email, country, reference
  // GuiaEnvia: Only uses alias (looks up rest from saved addresses)

  @Prop()
  alias?: string; // Used by GuiaEnvia

  @Prop()
  name?: string; // Used by all providers

  @Prop()
  lastName?: string; // Used by T1

  @Prop()
  phone?: string; // Used by Pakke, T1, Manuable

  @Prop()
  email?: string; // Used by Pakke, T1, Manuable

  @Prop()
  company?: string; // Used by Pakke (destination), Manuable

  @Prop()
  street1?: string; // Used by Pakke, T1, Manuable

  @Prop()
  street2?: string; // Used by Pakke (optional)

  @Prop()
  isResidential?: boolean; // Used by Pakke

  @Prop()
  external_number?: string; // Used by T1, Manuable

  @Prop()
  neighborhood?: string; // Used by Pakke, T1, Manuable

  @Prop()
  city?: string; // Used by Pakke, Manuable

  @Prop()
  town?: string; // Used by T1

  @Prop()
  state?: string; // Used by Pakke, T1, Manuable

  @Prop()
  zipcode?: string; // Used by Pakke

  @Prop()
  country?: string; // Used by Manuable

  @Prop()
  reference?: string; // Used by T1, Manuable
}

@Schema({ _id: false })
class Parcel {
  // Note: Fields are optional because different providers require different fields
  // Pakke: content, length, width, height, weight
  // T1: content only
  // Manuable: satProductId, content, value, quantity (NO dimensions!)
  // GuiaEnvia: length, width, height, weight, content, satProductId

  @Prop()
  length?: string; // Used by Pakke, GuiaEnvia

  @Prop()
  width?: string; // Used by Pakke, GuiaEnvia

  @Prop()
  height?: string; // Used by Pakke, GuiaEnvia

  @Prop()
  weight?: string; // Used by Pakke, GuiaEnvia

  @Prop()
  content?: string; // Used by all providers

  @Prop()
  satProductId?: string; // Used by Manuable, GuiaEnvia

  @Prop()
  value?: number; // Used by Manuable

  @Prop()
  quantity?: number; // Used by Manuable
}

@Schema({ _id: false })
class QuoteData {
  @Prop({ required: true })
  quoteId: string; // Always present

  @Prop()
  qAdjMode?: string; // Adjustment mode (e.g., 'percentage') - Optional

  @Prop()
  qBaseRef?: number; // Base quote total before adjustment - Optional

  @Prop()
  qAdjFactor?: number; // Adjustment factor (profit margin) - Optional

  @Prop()
  qAdjBasis?: number; // Basis for adjustment - Optional

  @Prop()
  qAdjSrcRef?: string; // Source reference for adjustment - Optional

  @Prop()
  total?: number; // Final total price - Optional (may not be available if quote lookup fails)

  @Prop()
  service?: string; // Service type selected - Optional

  @Prop()
  courier?: string; // Courier selected - Optional
}

@Schema({ _id: false })
class RetryAttempt {
  @Prop({ required: true })
  attemptNumber: number; // 1-10

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  error: string; // Error message from provider

  @Prop({ required: true })
  errorCode: string; // Kraft error code (GDE-XXX-###)
}

@Schema({ _id: false })
class Retries {
  @Prop({ type: [RetryAttempt], default: [] })
  retryAttempts: RetryAttempt[];

  @Prop({ default: 0, min: 0, max: 10 })
  retryCount: number;

  @Prop()
  lastRetryAt?: Date;
}

@Schema({ _id: false })
class Comment {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  adminId: Types.ObjectId;

  @Prop({ required: true, default: () => new Date() })
  timestamp: Date;
}

// Main Guide Schema
@Schema({
  timestamps: true,
  collection: 'guides',
})
export class Guide extends Document {
  // User relationship
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  // Tracking numbers (dual reference system)
  @Prop({ required: true, unique: true, index: true })
  kraftId: string; // KFT-202605-000001 - ALWAYS PRESENT, NEVER REPLACED

  @Prop({ sparse: true, index: true })
  externalId?: string; // Provider tracking number (nullable)

  @Prop({ default: false })
  isProviderTrackingSynced: boolean; // Has externalId been populated?

  // Provider information
  @Prop({ required: true, enum: ['GE', 'TONE', 'Pkk', 'Mn'], index: true })
  provider: string;

  // Guide status
  @Prop({
    required: true,
    enum: [
      'created',
      'failed',
      'waiting',
      'in-transit',
      'on-delivery',
      'delivered',
      'returned',
      'exception',
    ],
    default: 'failed',
    index: true,
  })
  status: string;

  // Address data (embedded)
  @Prop({ required: true, type: Address })
  origin: Address;

  @Prop({ required: true, type: Address })
  destination: Address;

  // Package information
  @Prop({ required: true, type: Parcel })
  parcel: Parcel;

  // Quote information
  @Prop({ required: true, type: QuoteData })
  quoteData: QuoteData;

  // Success data (populated when guide creation succeeds)
  @Prop()
  providerStatus?: string; // Original provider status string

  @Prop()
  labelUrl?: string; // Guide/label document URL

  // Failure information (only populated when guide creation fails)
  @Prop({ type: Object })
  failureInfo?: {
    errorDetails: string; // Error message from provider
    errorCode: string; // Kraft error code (GDE-XXX-###)
    providerResponse: Record<string, any>; // Full provider API response for debugging
    timestamp: Date; // When the failure occurred
  };

  // Retry management
  @Prop({ type: Retries, default: () => ({}) })
  retries: Retries;

  // Admin features
  @Prop({ type: [Comment], default: [] })
  comments: Comment[];

  // Sync tracking
  @Prop()
  lastSyncTimestamp?: Date;

  // Soft delete
  @Prop()
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;

  // Timestamps (auto-managed by Mongoose)
  createdAt: Date;
  updatedAt: Date;
}

export const GuideSchema = SchemaFactory.createForClass(Guide);

// Indexes
GuideSchema.index({ userId: 1, status: 1 }); // User guides by status
GuideSchema.index({ userId: 1, createdAt: -1 }); // User guides sorted by date
GuideSchema.index({ userId: 1, provider: 1 }); // User guides by provider
GuideSchema.index({ kraftId: 1 }, { unique: true }); // Unique kraftId
GuideSchema.index({ externalId: 1 }, { sparse: true }); // Provider tracking (allows nulls)
GuideSchema.index({ createdAt: -1 }); // Date sorting
GuideSchema.index({ deletedAt: 1 }); // Soft delete queries
```

### KraftId Counter Schema

For generating sequential kraftId values:

**Rationale**: We use a counter-based approach instead of random numbers because:

- **Sequential IDs are user-friendly**: KFT-202605-000001, KFT-202605-000002 is easier to communicate and remember
- **Professional appearance**: Looks more legitimate to customers and support teams
- **Sortable by creation order**: Naturally ordered chronologically
- **Collision-free**: Atomic MongoDB `findOneAndUpdate` with `$inc` ensures no duplicates
- **Predictable format**: Makes customer support and debugging easier
- **Monthly reset**: Keeps sequence numbers manageable (000001-999999 per month)

Random numbers would lack these benefits and could still have collisions requiring retry logic.

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'kraftid_counters' })
export class KraftIdCounter extends Document {
  @Prop({ required: true, unique: true })
  yearMonth: string; // Format: "YYYYMM" (e.g., "202605")

  @Prop({ required: true, default: 0 })
  sequence: number; // Current sequence number

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const KraftIdCounterSchema =
  SchemaFactory.createForClass(KraftIdCounter);

// Index for fast lookups
KraftIdCounterSchema.index({ yearMonth: 1 }, { unique: true });
```

---

## API Endpoints Specification

### 1. Create Guide (POST /guides/db/create)

**Purpose**: Create a new guide with external provider and persist to database

**Authentication**: Required (JWT)

**Request DTO**:

```typescript
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CreateGuideAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  alias: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  street1: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  street2?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  isResidential?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  external_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  town: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  zipcode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reference: string;
}

class ParcelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  length: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  width: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  height: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  weight: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  satProductId: string;

  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiProperty()
  @IsNumber()
  quantity: number;
}

export class CreateGuideDto {
  @ApiProperty({ enum: ['GE', 'TONE', 'Pkk', 'Mn'] })
  @IsEnum(['GE', 'TONE', 'Pkk', 'Mn'])
  provider: 'GE' | 'TONE' | 'Pkk' | 'Mn';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  quoteId: string;

  @ApiProperty({ type: ParcelDto })
  @ValidateNested()
  @Type(() => ParcelDto)
  parcel: ParcelDto;

  @ApiProperty({ type: CreateGuideAddressDto })
  @ValidateNested()
  @Type(() => CreateGuideAddressDto)
  origin: CreateGuideAddressDto;

  @ApiProperty({ type: CreateGuideAddressDto })
  @ValidateNested()
  @Type(() => CreateGuideAddressDto)
  destination: CreateGuideAddressDto;

  @ApiProperty()
  @IsBoolean()
  notifyMe: boolean; // T1-specific
}
```

**Response DTO**:

```typescript
export class GuideDataDto {
  @ApiProperty()
  kraftId: string; // Always present

  @ApiProperty({ required: false })
  externalId?: string; // May be null if creation failed

  @ApiProperty()
  status: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  isProviderTrackingSynced: boolean;

  @ApiProperty({ required: false })
  labelUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Failure info (only present if status is 'failed')
  @ApiProperty({ required: false })
  failureInfo?: {
    errorDetails: string;
    errorCode: string;
    timestamp: Date;
  };
}

// Standardized response format (consistent with quotes.service.ts)
export class GuideResponseDto {
  @ApiProperty()
  version: string; // NPM version

  @ApiProperty({ required: false })
  message: string | null;

  @ApiProperty({ required: false })
  error: string | null;

  @ApiProperty({ type: GuideDataDto })
  data: GuideDataDto;
}
```

**Controller Implementation**:

```typescript
@Controller('guides/db')
@UseGuards(JwtAuthGuard)
export class GuidesDbController {
  constructor(private readonly guidesDbService: GuidesDbService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new guide with database persistence' })
  @ApiResponse({ status: 201, type: GuideResponseDto })
  async createGuide(
    @Body() createGuideDto: CreateGuideDto,
    @CurrentUser() user: User,
  ): Promise<GuideResponseDto> {
    return this.guidesDbService.createGuide(user._id, createGuideDto);
  }
}
```

**Flow**:

1. Validate request DTO
2. Extract userId from JWT
3. Generate kraftId
4. Call provider service based on `provider` field
5. Save guide to DB (always, regardless of provider response)
6. Return guide data with kraftId

---

### 2. Get User Guides (GET /guides/db)

**Purpose**: Retrieve guides for authenticated user with filters

**Authentication**: Required (JWT)

**Query Parameters**:

```typescript
export class GetGuidesQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['GE', 'TONE', 'Pkk', 'Mn'])
  provider?: 'GE' | 'TONE' | 'Pkk' | 'Mn';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  trackingNumber?: string; // Search kraftId or externalId

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}
```

**Response DTO**:

```typescript
export class PaginatedGuidesDataDto {
  @ApiProperty({ type: [GuideDataDto] })
  guides: GuideDataDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// Standardized response format
export class PaginatedGuidesResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ required: false })
  message: string | null;

  @ApiProperty({ required: false })
  error: string | null;

  @ApiProperty({ type: PaginatedGuidesDataDto })
  data: PaginatedGuidesDataDto;
}
```

**Controller Implementation**:

```typescript
@Get()
@ApiOperation({ summary: 'Get guides for authenticated user' })
@ApiResponse({ status: 200, type: PaginatedGuidesResponseDto })
async getUserGuides(
  @Query() query: GetGuidesQueryDto,
  @CurrentUser() user: User,
): Promise<PaginatedGuidesResponseDto> {
  return this.guidesDbService.getGuidesByUser(user._id, query);
}
```

---

### 3. Get Admin Guides (GET /guides/db/admin)

**Purpose**: Admin queries with scope selection and month/year filters

**Authentication**: Required (JWT + Admin role)

**Query Parameters**:

```typescript
export class GetAdminGuidesQueryDto extends GetGuidesQueryDto {
  @ApiProperty({ enum: ['all', 'own'], required: true })
  @IsEnum(['all', 'own'])
  scope: 'all' | 'own';

  @ApiProperty({ required: false, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  month?: number; // Defaults to current month

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  year?: number; // Defaults to current year

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string; // Filter by specific user (when scope='all')
}
```

**Controller Implementation**:

```typescript
@Get('admin')
@UseGuards(AdminGuard)
@ApiOperation({ summary: 'Get guides with admin scope' })
@ApiResponse({ status: 200, type: PaginatedGuidesResponseDto })
async getAdminGuides(
  @Query() query: GetAdminGuidesQueryDto,
  @CurrentUser() admin: User,
): Promise<PaginatedGuidesResponseDto> {
  return this.guidesDbService.getAllGuides(query, admin._id);
}
```

---

### 4. Get Single Guide (GET /guides/db/:guideId)

**Purpose**: Get guide detail with on-demand sync

**Authentication**: Required (JWT)

**Controller Implementation**:

```typescript
@Get(':guideId')
@ApiOperation({ summary: 'Get guide detail with on-demand sync' })
@ApiResponse({ status: 200, type: GuideResponseDto })
async getGuide(
  @Param('guideId') guideId: string,
  @CurrentUser() user: User,
): Promise<GuideResponseDto> {
  const isAdmin = user.role === 'admin';
  return this.guidesDbService.getGuideById(guideId, user._id, isAdmin);
}
```

**Flow**:

1. Fetch guide from DB
2. Check authorization (user owns guide OR user is admin)
3. If externalId exists, sync with provider
4. Update DB with latest status
5. Return updated guide

---

### 5. Retry Failed Guide (POST /guides/db/:guideId/retry)

**Purpose**: Retry failed guide creation with rate limiting

**Authentication**: Required (JWT)

**Controller Implementation**:

```typescript
@Post(':guideId/retry')
@ApiOperation({ summary: 'Retry failed guide creation' })
@ApiResponse({ status: 200, type: GuideResponseDto })
async retryGuide(
  @Param('guideId') guideId: string,
  @CurrentUser() user: User,
): Promise<GuideResponseDto> {
  return this.guidesDbService.retryFailedGuide(guideId, user._id);
}
```

**Flow**:

1. Check retry eligibility (count < 10, cooldown passed)
2. Retrieve stored payload
3. Call provider API
4. Update guide record (same kraftId)
5. Add retry attempt to history

---

### 6. Add Admin Comment (POST /guides/db/:guideId/comments)

**Purpose**: Admin adds comment to guide

**Authentication**: Required (JWT + Admin role)

**Request DTO**:

```typescript
export class AddCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;
}
```

**Controller Implementation**:

```typescript
@Post(':guideId/comments')
@UseGuards(AdminGuard)
@ApiOperation({ summary: 'Add admin comment to guide' })
@ApiResponse({ status: 201 })
async addComment(
  @Param('guideId') guideId: string,
  @Body() addCommentDto: AddCommentDto,
  @CurrentUser() admin: User,
): Promise<GuideResponseDto> {
  return this.guidesDbService.addComment(guideId, admin._id, addCommentDto.text);
}
```

---

### 7. Update Guide Status (PATCH /guides/db/:guideId/status)

**Purpose**: Admin manually updates guide status

**Authentication**: Required (JWT + Admin role)

**Request DTO**:

```typescript
export class UpdateStatusDto {
  @ApiProperty({
    enum: [
      'created',
      'failed',
      'waiting',
      'in-transit',
      'on-delivery',
      'delivered',
      'returned',
      'exception',
    ],
  })
  @IsEnum([
    'created',
    'failed',
    'waiting',
    'in-transit',
    'on-delivery',
    'delivered',
    'returned',
    'exception',
  ])
  status: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string; // Optional reason for status change
}
```

**Controller Implementation**:

```typescript
@Patch(':guideId/status')
@UseGuards(AdminGuard)
@ApiOperation({ summary: 'Update guide status manually (admin)' })
@ApiResponse({ status: 200, type: GuideResponseDto })
async updateStatus(
  @Param('guideId') guideId: string,
  @Body() updateStatusDto: UpdateStatusDto,
  @CurrentUser() admin: User,
): Promise<GuideResponseDto> {
  return this.guidesDbService.updateGuideStatus(guideId, updateStatusDto.status, admin._id, updateStatusDto.reason);
}
```

---

### 8. Soft Delete Guide (DELETE /guides/db/:guideId)

**Purpose**: User soft deletes their guide

**Authentication**: Required (JWT)

**Controller Implementation**:

```typescript
@Delete(':guideId')
@ApiOperation({ summary: 'Soft delete guide (user)' })
@ApiResponse({ status: 200 })
async softDeleteGuide(
  @Param('guideId') guideId: string,
  @CurrentUser() user: User,
): Promise<{ message: string }> {
  await this.guidesDbService.softDeleteGuide(guideId, user._id);
  return {
    version: process.env.npm_package_version || '1.0.0',
    message: 'Guide deleted successfully',
    error: null,
    data: null,
  };
}
```

---

### 9. Hard Delete Guide (DELETE /guides/db/:guideId/hard)

**Purpose**: Admin permanently deletes guide

**Authentication**: Required (JWT + Admin role)

**Controller Implementation**:

```typescript
@Delete(':guideId/hard')
@UseGuards(AdminGuard)
@ApiOperation({ summary: 'Hard delete guide (admin only)' })
@ApiResponse({ status: 200 })
async hardDeleteGuide(
  @Param('guideId') guideId: string,
  @CurrentUser() admin: User,
): Promise<{ message: string }> {
  await this.guidesDbService.hardDeleteGuide(guideId, admin._id);
  return {
    version: process.env.npm_package_version || '1.0.0',
    message: 'Guide permanently deleted',
    error: null,
    data: null,
  };
}
```

---

## Service Layer Architecture

### GuidesDbService

**Purpose**: Main service for guide database operations

**Dependencies**:

- `GuideModel` (Mongoose model)
- `KraftIdCounterModel` (Mongoose model)
- `GuiaEnviaService`
- `T1Service`
- `PakkeService`
- `ManuableService`

**Key Methods**:

#### 1. createGuide(userId, payload)

```typescript
async createGuide(userId: string, payload: CreateGuideDto): Promise<GuideResponseDto> {
  try {
    // 1. Generate kraftId immediately
    const kraftId = await this.generateKraftId();

    // 2. Call provider API based on payload.provider
    const providerResult = await this.callProviderApi(payload);

    // 3. Prepare guide document
    const guideData = {
      userId,
      kraftId,
      provider: payload.provider,
      status: providerResult.success ? 'created' : 'failed',
      externalId: providerResult.externalId || null,
      isProviderTrackingSynced: !!providerResult.externalId,
      origin: payload.origin,
      destination: payload.destination,
      parcel: payload.parcel,
      quoteData: {
        quoteId: payload.quoteId,
        // ... extract quote data from quote lookup
      },
      labelUrl: providerResult.labelUrl,
      // Only store failure info if creation failed
      failureInfo: providerResult.success ? undefined : {
        errorDetails: providerResult.error,
        errorCode: providerResult.errorCode,
        providerResponse: providerResult.response,
        timestamp: new Date(),
      },
      retries: {
        retryAttempts: [],
        retryCount: 0,
      },
    };

    // 4. Save to database
    const guide = await this.guideModel.create(guideData);

    // 5. Return formatted response
    return this.formatGuideResponse(guide);
  } catch (error) {
    // Handle and throw appropriate KraftError
    throw new KraftError('GDE-BDN-001', 'Failed to create guide', error);
  }
}
```

#### 2. generateKraftId()

```typescript
async generateKraftId(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  try {
    // Atomic increment
    const counter = await this.kraftIdCounterModel.findOneAndUpdate(
      { yearMonth },
      { $inc: { sequence: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const sequence = counter.sequence.toString().padStart(6, '0');
    return `KFT-${yearMonth}-${sequence}`;
  } catch (error) {
    throw new KraftError('GDE-BDN-008', 'Failed to generate kraftId', error);
  }
}
```

#### 3. retryFailedGuide(guideId, userId)

```typescript
async retryFailedGuide(guideId: string, userId: string): Promise<GuideResponseDto> {
  // 1. Fetch guide and verify ownership
  const guide = await this.findGuideAndVerifyOwnership(guideId, userId);

  // 2. Check eligibility
  await this.checkRetryEligibility(guide);

  // 3. Call provider API with stored data
  const providerResult = await this.callProviderApi({
    provider: guide.provider,
    origin: guide.origin,
    destination: guide.destination,
    parcel: guide.parcel,
    quoteId: guide.quoteData.quoteId,
    notifyMe: false,
  });

  // 4. Update guide record
  guide.status = providerResult.success ? 'created' : 'failed';
  guide.externalId = providerResult.externalId || guide.externalId;
  guide.isProviderTrackingSynced = !!providerResult.externalId;

  // Update failure info
  if (!providerResult.success) {
    guide.failureInfo = {
      errorDetails: providerResult.error,
      errorCode: providerResult.errorCode,
      providerResponse: providerResult.response,
      timestamp: new Date(),
    };
  } else {
    // Clear failure info on success
    guide.failureInfo = undefined;
  }

  // 5. Add retry attempt to history
  guide.retries.retryAttempts.push({
    attemptNumber: guide.retries.retryCount + 1,
    timestamp: new Date(),
    userId,
    error: providerResult.error || 'Retry successful',
    errorCode: providerResult.errorCode || 'SUCCESS',
  });
  guide.retries.retryCount += 1;
  guide.retries.lastRetryAt = new Date();

  await guide.save();

  return this.formatGuideResponse(guide);
}
```

#### 4. checkRetryEligibility(guide)

```typescript
async checkRetryEligibility(guide: Guide): Promise<void> {
  // Check status
  if (guide.status !== 'failed') {
    throw new KraftError('GDE-BUS-001', 'Guide is not in failed status');
  }

  // Check retry count
  if (guide.retries.retryCount >= 10) {
    throw new KraftError('GDE-RLIM-001', 'Maximum retry attempts exceeded');
  }

  // Check cooldown (5 minutes)
  if (guide.retries.lastRetryAt) {
    const minutesSinceLastRetry = (Date.now() - guide.retries.lastRetryAt.getTime()) / 1000 / 60;
    if (minutesSinceLastRetry < 5) {
      throw new KraftError('GDE-RLIM-002', 'Retry cooldown period active. Please wait 5 minutes.');
    }
  }
}
```

#### 5. getGuidesByUser(userId, filters)

```typescript
async getGuidesByUser(userId: string, filters: GetGuidesQueryDto): Promise<PaginatedGuidesResponseDto> {
  const { page = 1, limit = 10, status, provider, trackingNumber, startDate, endDate } = filters;

  const query: any = {
    userId,
    deletedAt: null // Exclude soft-deleted guides
  };

  // Apply filters
  if (status) query.status = status;
  if (provider) query.provider = provider;
  if (trackingNumber) {
    query.$or = [
      { kraftId: new RegExp(trackingNumber, 'i') },
      { externalId: new RegExp(trackingNumber, 'i') }
    ];
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const skip = (page - 1) * limit;

  const [guides, total] = await Promise.all([
    this.guideModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.guideModel.countDocuments(query)
  ]);

  return {
    data: guides.map(g => this.formatGuideResponse(g)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}
```

#### 6. getAllGuides(filters, adminId)

```typescript
async getAllGuides(filters: GetAdminGuidesQueryDto, adminId: string): Promise<PaginatedGuidesResponseDto> {
  const { scope, month, year, userId, ...restFilters } = filters;

  // Default month/year to current if not provided
  const currentDate = new Date();
  const targetMonth = month || currentDate.getMonth() + 1;
  const targetYear = year || currentDate.getFullYear();

  const query: any = { deletedAt: null };

  // Apply scope
  if (scope === 'own') {
    query.userId = adminId;
  } else if (scope === 'all' && userId) {
    query.userId = userId;
  }

  // Apply month/year filter
  const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
  const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
  query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };

  // Apply other filters (status, provider, etc.)
  if (restFilters.status) query.status = restFilters.status;
  if (restFilters.provider) query.provider = restFilters.provider;
  if (restFilters.trackingNumber) {
    query.$or = [
      { kraftId: new RegExp(restFilters.trackingNumber, 'i') },
      { externalId: new RegExp(restFilters.trackingNumber, 'i') }
    ];
  }

  // Pagination and query execution...
  // (Similar to getGuidesByUser)
}
```

#### 7. syncGuideWithProvider(guideId)

```typescript
async syncGuideWithProvider(guideId: string): Promise<void> {
  const guide = await this.guideModel.findById(guideId);
  if (!guide || !guide.externalId) return;

  try {
    const providerStatus = await this.fetchProviderStatus(guide.provider, guide.externalId);

    // Update guide with latest status
    guide.status = this.mapProviderStatus(guide.provider, providerStatus);
    guide.providerStatus = providerStatus.rawStatus;
    guide.lastSyncTimestamp = new Date();

    await guide.save();
  } catch (error) {
    // Log error but don't throw - sync is best-effort
    console.error('Sync error:', error);
  }
}
```

#### 8. Provider API Routing

```typescript
private async callProviderApi(payload: CreateGuideDto): Promise<ProviderResult> {
  try {
    switch (payload.provider) {
      case 'GE':
        return await this.guiaEnviaService.createGuide(payload);
      case 'TONE':
        return await this.t1Service.createGuide(payload);
      case 'Pkk':
        return await this.pakkeService.createGuide(payload);
      case 'Mn':
        return await this.manuableService.createGuide(payload);
      default:
        throw new KraftError('GDE-BUS-007', 'Invalid provider specified');
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorCode: this.mapProviderErrorToKraftCode(error),
    };
  }
}
```

---

## Error Handling Implementation

### KraftError Class

```typescript
export class KraftError extends Error {
  constructor(
    public readonly code: string,
    public readonly userMessage: string,
    public readonly technicalDetails?: any,
  ) {
    super(userMessage);
    this.name = 'KraftError';
  }
}
```

### Error Filter

```typescript
@Catch(KraftError)
export class KraftErrorFilter implements ExceptionFilter {
  catch(exception: KraftError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const statusCode = this.getHttpStatusCode(exception.code);

    response.status(statusCode).json({
      success: false,
      errorCode: exception.code,
      message: exception.userMessage,
      timestamp: new Date().toISOString(),
    });

    // Log technical details server-side
    console.error('KraftError:', {
      code: exception.code,
      message: exception.userMessage,
      technical: exception.technicalDetails,
    });
  }

  private getHttpStatusCode(errorCode: string): number {
    const prefix = errorCode.split('-')[1];
    const mapping = {
      AUTH: 403,
      NF: 404,
      VAL: 400,
      RLIM: 429,
      BUS: 400,
    };
    return mapping[prefix] || 500;
  }
}
```

### Error Code Mapping

```typescript
// In GuidesDbService
private mapProviderErrorToKraftCode(error: any): string {
  if (error.code === 'ENOTFOUND') return 'GDE-NET-001';
  if (error.code === 'ETIMEDOUT') return 'GDE-TMOT-001';
  if (error.message?.includes('rate limit')) return 'GDE-RLIM-003';
  if (error.response?.status === 401) return 'GDE-PVR-003';
  if (error.response?.status >= 500) return 'GDE-PVR-004';
  return 'GDE-PVR-001'; // Generic provider error
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Deliverables**:

- MongoDB schemas (Guide, KraftIdCounter)
- Database connection and configuration
- Basic service structure
- KraftId generation logic

**Tasks**:

1. Create Guide entity with all fields
2. Create KraftIdCounter entity
3. Set up database indexes
4. Implement generateKraftId() method
5. Write unit tests for kraftId generation

**Success Criteria**:

- Schemas compile without errors
- KraftId generation is sequential and unique
- Indexes are properly configured

---

### Phase 2: Core Guide Creation (Week 2)

**Deliverables**:

- Guide creation endpoint
- Provider service integration
- Basic error handling

**Tasks**:

1. Create CreateGuideDto with validation
2. Implement createGuide() service method
3. Update provider services to return standardized format
4. Implement callProviderApi() routing logic
5. Create POST /guides/db/create endpoint
6. Add basic error handling
7. Write integration tests

**Success Criteria**:

- Guide creation works with all 4 providers
- KraftId always generated
- Failed guides saved with error details
- External tracking ID captured on success

---

### Phase 3: Retrieval & Search (Week 3)

**Deliverables**:

- User guide retrieval
- Admin guide retrieval with scope
- Search by tracking number

**Tasks**:

1. Implement getGuidesByUser()
2. Implement getAllGuides() with scope logic
3. Add month/year filtering for admin
4. Implement tracking number search (dual)
5. Create GET /guides/db endpoint
6. Create GET /guides/db/admin endpoint
7. Create GET /guides/db/:guideId endpoint
8. Add pagination
9. Write query tests

**Success Criteria**:

- Users see only their guides
- Admins can switch between 'all' and 'own'
- Tracking number search works for both IDs
- Pagination works correctly
- Month/year filtering works

---

### Phase 4: Retry & Sync (Week 4)

**Deliverables**:

- Retry failed guides with rate limiting
- On-demand sync with providers
- Retry history tracking

**Tasks**:

1. Implement checkRetryEligibility()
2. Implement retryFailedGuide()
3. Add retry attempt tracking
4. Implement syncGuideWithProvider()
5. Create POST /guides/db/:guideId/retry endpoint
6. Add rate limiting logic
7. Write retry tests

**Success Criteria**:

- Retry respects 10-attempt limit
- 5-minute cooldown enforced
- Retry history captured
- KraftId unchanged after retry
- Sync updates status from provider

---

### Phase 5: Admin Features (Week 5)

**Deliverables**:

- Admin comments
- Manual status override
- Soft/hard delete

**Tasks**:

1. Implement addComment()
2. Implement updateGuideStatus()
3. Implement softDeleteGuide()
4. Implement hardDeleteGuide()
5. Create admin endpoints
6. Add admin guards
7. Write admin feature tests

**Success Criteria**:

- Admins can add comments
- Status can be manually changed
- Soft delete hides guides
- Hard delete removes permanently
- Only admins can hard delete

---

### Phase 6: Error Handling & Polish (Week 6)

**Deliverables**:

- Complete error code system
- User-friendly error messages
- Error mapping
- Documentation

**Tasks**:

1. Implement KraftError class
2. Create error filter
3. Add error code mapping for all scenarios
4. Map provider errors to Kraft codes
5. Add user-friendly messages
6. Update Swagger documentation
7. Write error handling tests

**Success Criteria**:

- All errors have Kraft codes
- User-friendly messages shown
- Technical details logged
- Error codes documented

---

### Phase 7: Testing & QA (Week 7)

**Deliverables**:

- Comprehensive test suite
- E2E tests
- Performance testing
- Bug fixes

**Tasks**:

1. Write unit tests for all service methods
2. Write integration tests for all endpoints
3. Write E2E tests for complete flows
4. Test with all 4 providers
5. Performance test with large datasets
6. Load test retry mechanism
7. Security testing
8. Fix identified bugs

**Success Criteria**:

- > 80% code coverage
- All endpoints tested
- No critical bugs
- Performance acceptable

---

### Phase 8: Deployment & Monitoring (Week 8)

**Deliverables**:

- Production deployment
- Monitoring setup
- Documentation

**Tasks**:

1. Deploy to staging
2. Run smoke tests
3. Deploy to production
4. Set up monitoring/alerts
5. Update API documentation
6. Create runbook for operations
7. Train team on new system

**Success Criteria**:

- System deployed to production
- Monitoring in place
- Documentation complete
- Team trained

---

## Task Breakdown

### Database Tasks

- [ ] Create Guide entity schema
- [ ] Create KraftIdCounter entity schema
- [ ] Set up MongoDB indexes
- [ ] Test schema validation
- [ ] Document schema fields

### Service Layer Tasks

- [ ] Create GuidesDbService
- [ ] Implement generateKraftId()
- [ ] Implement createGuide()
- [ ] Implement retryFailedGuide()
- [ ] Implement checkRetryEligibility()
- [ ] Implement getGuidesByUser()
- [ ] Implement getAllGuides()
- [ ] Implement getGuideById()
- [ ] Implement syncGuideWithProvider()
- [ ] Implement addComment()
- [ ] Implement updateGuideStatus()
- [ ] Implement softDeleteGuide()
- [ ] Implement hardDeleteGuide()
- [ ] Implement searchByTrackingNumber()
- [ ] Implement callProviderApi() routing
- [ ] Implement provider error mapping

### Provider Integration Tasks

- [ ] Update GuiaEnviaService to accept standardized payload
- [ ] Update T1Service to accept standardized payload
- [ ] Update PakkeService to accept standardized payload
- [ ] Update ManuableService to accept standardized payload
- [ ] Standardize provider response format
- [ ] Test provider integrations

### Controller Tasks

- [ ] Create GuidesDbController
- [ ] Implement POST /guides/db/create
- [ ] Implement GET /guides/db
- [ ] Implement GET /guides/db/admin
- [ ] Implement GET /guides/db/:guideId
- [ ] Implement POST /guides/db/:guideId/retry
- [ ] Implement POST /guides/db/:guideId/comments
- [ ] Implement PATCH /guides/db/:guideId/status
- [ ] Implement DELETE /guides/db/:guideId
- [ ] Implement DELETE /guides/db/:guideId/hard
- [ ] Add Swagger documentation

### DTO Tasks

- [ ] Create CreateGuideDto
- [ ] Create CreateGuideAddressDto
- [ ] Create ParcelDto
- [ ] Create GetGuidesQueryDto
- [ ] Create GetAdminGuidesQueryDto
- [ ] Create GuideResponseDto
- [ ] Create PaginatedGuidesResponseDto
- [ ] Create AddCommentDto
- [ ] Create UpdateStatusDto
- [ ] Add validation decorators

### Error Handling Tasks

- [ ] Create KraftError class
- [ ] Create KraftErrorFilter
- [ ] Implement error code mapping
- [ ] Map provider errors to Kraft codes
- [ ] Add user-friendly messages
- [ ] Document all error codes

### Testing Tasks

- [ ] Unit tests for GuidesDbService
- [ ] Unit tests for kraftId generation
- [ ] Unit tests for retry logic
- [ ] Integration tests for guide creation
- [ ] Integration tests for retrieval
- [ ] Integration tests for retry
- [ ] Integration tests for admin features
- [ ] E2E tests for complete flows
- [ ] Test with all 4 providers
- [ ] Performance tests
- [ ] Load tests

---

## Testing Strategy

### Unit Tests

**Target**: Service methods in isolation

**Tools**: Jest, Mocha

**Coverage**:

- `generateKraftId()` - sequence generation, uniqueness
- `checkRetryEligibility()` - count limits, cooldown logic
- `callProviderApi()` - routing logic, error handling
- `formatGuideResponse()` - data transformation
- Provider error mapping

**Example**:

```typescript
describe('GuidesDbService - generateKraftId', () => {
  it('should generate kraftId in correct format', async () => {
    const kraftId = await service.generateKraftId();
    expect(kraftId).toMatch(/^KFT-\d{6}-\d{6}$/);
  });

  it('should generate sequential kraftIds', async () => {
    const id1 = await service.generateKraftId();
    const id2 = await service.generateKraftId();
    const seq1 = parseInt(id1.split('-')[2]);
    const seq2 = parseInt(id2.split('-')[2]);
    expect(seq2).toBe(seq1 + 1);
  });
});
```

---

### Integration Tests

**Target**: API endpoints with database

**Tools**: Jest, supertest

**Coverage**:

- POST /guides/db/create with each provider
- GET /guides/db with filters
- GET /guides/db/admin with scope
- POST /guides/db/:id/retry
- Authorization checks
- Pagination

**Example**:

```typescript
describe('POST /guides/db/create', () => {
  it('should create guide with GE provider', async () => {
    const response = await request(app)
      .post('/guides/db/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        provider: 'GE',
        quoteId: 'test-quote-123',
        // ... rest of payload
      })
      .expect(201);

    expect(response.body).toHaveProperty('kraftId');
    expect(response.body.kraftId).toMatch(/^KFT-/);
  });

  it('should save guide even when provider fails', async () => {
    // Mock provider failure
    jest
      .spyOn(guiaEnviaService, 'createGuide')
      .mockRejectedValue(new Error('Provider error'));

    const response = await request(app)
      .post('/guides/db/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validPayload)
      .expect(201);

    expect(response.body.status).toBe('failed');
    expect(response.body).toHaveProperty('kraftId');
    expect(response.body.errorDetails).toBeTruthy();
  });
});
```

---

### E2E Tests

**Target**: Complete user workflows

**Tools**: Jest, supertest

**Scenarios**:

1. User creates guide → retrieves it → views detail
2. User creates guide (fails) → retries multiple times → succeeds
3. Admin views all guides → filters by user → adds comment
4. User searches by tracking number (kraftId and externalId)
5. User soft deletes guide → admin hard deletes guide

**Example Flow**:

```typescript
describe('E2E: Failed guide retry flow', () => {
  it('should allow user to retry failed guide up to 10 times', async () => {
    // 1. Create guide that fails
    const createResponse = await request(app)
      .post('/guides/db/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payloadThatFails);

    const guideId = createResponse.body.id;
    expect(createResponse.body.status).toBe('failed');

    // 2. Retry multiple times
    for (let i = 1; i <= 10; i++) {
      const retryResponse = await request(app)
        .post(`/guides/db/${guideId}/retry`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(retryResponse.body.retries.retryCount).toBe(i);
    }

    // 3. 11th attempt should fail with rate limit error
    await request(app)
      .post(`/guides/db/${guideId}/retry`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(429);
  });
});
```

---

### Performance Tests

**Target**: Query performance, concurrency

**Tools**: k6, Artillery

**Scenarios**:

- 100 concurrent guide creations
- Pagination with 10,000 guides
- Tracking number search across large dataset
- Multiple retries in quick succession

---

## Success Criteria

### Functional Requirements

✅ **Guide Creation**

- [ ] Guide created with all 4 providers
- [ ] KraftId always generated before provider call
- [ ] Guide saved to DB regardless of provider success/failure
- [ ] ExternalId captured when provider succeeds
- [ ] Failed guides contain error details

✅ **User Guide Retrieval**

- [ ] Users see only their own guides
- [ ] Pagination works correctly
- [ ] Filters work (status, provider, date range)
- [ ] Search works for both kraftId and externalId
- [ ] Soft-deleted guides excluded from results

✅ **Admin Access**

- [ ] Admins can view all guides with scope='all'
- [ ] Admins can view only their guides with scope='own'
- [ ] Month/year filtering works
- [ ] Admin can search any guide

✅ **Retry Mechanism**

- [ ] Maximum 10 retry attempts enforced
- [ ] 5-minute cooldown between retries enforced
- [ ] Retry history captured with timestamps
- [ ] KraftId unchanged after retry
- [ ] Guide status updates on successful retry

✅ **Admin Features**

- [ ] Admin can add comments to guides
- [ ] Admin can manually update guide status
- [ ] Users can soft delete guides
- [ ] Only admins can hard delete guides

✅ **Error Handling**

- [ ] All errors have Kraft error codes
- [ ] User-friendly messages displayed
- [ ] Technical errors logged server-side
- [ ] Provider errors mapped to Kraft codes

---

### Non-Functional Requirements

✅ **Performance**

- [ ] Guide creation < 3 seconds (including provider call)
- [ ] Guide retrieval < 500ms for 100 guides
- [ ] Search response < 1 second
- [ ] Support 100 concurrent users

✅ **Security**

- [ ] JWT authentication on all endpoints
- [ ] Users cannot access other users' guides
- [ ] Admin role required for admin endpoints
- [ ] Sensitive data properly protected

✅ **Data Integrity**

- [ ] KraftId always unique
- [ ] No duplicate guides
- [ ] Retry count cannot exceed 10
- [ ] Soft-deleted guides recoverable

✅ **Code Quality**

- [ ] > 80% test coverage
- [ ] All endpoints documented in Swagger
- [ ] Type safety (TypeScript strict mode)
- [ ] Linting passes (ESLint)

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Documentation updated
- [ ] API documentation generated

### Deployment Steps

1. [ ] Deploy database schema to staging
2. [ ] Deploy application to staging
3. [ ] Run smoke tests on staging
4. [ ] Deploy database schema to production
5. [ ] Deploy application to production
6. [ ] Run smoke tests on production
7. [ ] Monitor error logs
8. [ ] Verify metrics

### Post-Deployment

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check database indexes
- [ ] Verify all providers working
- [ ] Check retry mechanism
- [ ] Verify admin features

---

## Monitoring & Observability

### Metrics to Track

**Business Metrics**:

- Guides created per day/hour
- Success rate by provider
- Failed guide retry success rate
- Average time to successful retry
- Guides by status

**Technical Metrics**:

- API response times
- Database query performance
- Provider API response times
- Error rates by error code
- Retry cooldown violations

**Alerts**:

- Guide creation failure rate > 10%
- Database connection errors
- Provider API timeout > 5 seconds
- KraftId generation failures
- Retry rate limit errors spiking

---

## Appendix

### Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/kraft
MONGODB_DB_NAME=kraft

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# Provider API Keys
GUIA_ENVIA_API_KEY=xxx
T1_API_KEY=xxx
PAKKE_API_KEY=xxx
MANUABLE_API_KEY=xxx

# Provider API URLs
GUIA_ENVIA_BASE_URL=https://api.guiaenvia.com
T1_BASE_URL=https://api.t1.com
PAKKE_BASE_URL=https://api.pakke.com
MANUABLE_BASE_URL=https://api.manuable.com
```

### Database Indexes (Summary)

```javascript
// guides collection
db.guides.createIndex({ userId: 1, status: 1 });
db.guides.createIndex({ userId: 1, createdAt: -1 });
db.guides.createIndex({ userId: 1, provider: 1 });
db.guides.createIndex({ kraftId: 1 }, { unique: true });
db.guides.createIndex({ externalId: 1 }, { sparse: true });
db.guides.createIndex({ createdAt: -1 });
db.guides.createIndex({ deletedAt: 1 });

// kraftid_counters collection
db.kraftid_counters.createIndex({ yearMonth: 1 }, { unique: true });
```

### API Endpoint Summary

| Method | Endpoint                | Auth  | Description        |
| ------ | ----------------------- | ----- | ------------------ |
| POST   | /guides/db/create       | User  | Create guide       |
| GET    | /guides/db              | User  | Get user guides    |
| GET    | /guides/db/admin        | Admin | Get admin guides   |
| GET    | /guides/db/:id          | User  | Get guide detail   |
| POST   | /guides/db/:id/retry    | User  | Retry failed guide |
| POST   | /guides/db/:id/comments | Admin | Add comment        |
| PATCH  | /guides/db/:id/status   | Admin | Update status      |
| DELETE | /guides/db/:id          | User  | Soft delete        |
| DELETE | /guides/db/:id/hard     | Admin | Hard delete        |

---

## Timeline Summary

- **Phase 1 (Week 1)**: Foundation - Schemas, KraftId generation
- **Phase 2 (Week 2)**: Core guide creation
- **Phase 3 (Week 3)**: Retrieval & search
- **Phase 4 (Week 4)**: Retry & sync
- **Phase 5 (Week 5)**: Admin features
- **Phase 6 (Week 6)**: Error handling & polish
- **Phase 7 (Week 7)**: Testing & QA
- **Phase 8 (Week 8)**: Deployment & monitoring

**Total Duration**: 8 weeks

---

## Next Steps

1. Review this implementation plan with the team
2. Assign team members to phases
3. Set up project tracking (Jira, GitHub Projects, etc.)
4. Begin Phase 1: Foundation
5. Schedule weekly progress reviews

---

**Document Status**: Ready for Implementation
**Last Updated**: 2026-06-15
**Author**: Development Team
**Reviewed By**: [To be filled]
