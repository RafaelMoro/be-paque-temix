# Guide Tracking Database Research

## Overview

This document outlines the high-level actions needed to implement guide tracking in the database. The system will transition from using external APIs as the sole source of truth to using the database as the primary storage, with external APIs serving as sync mechanisms.

**Note**: Throughout this document, "guide" and "order" are used interchangeably, referring to shipping guides/labels created with external providers.

## Current Architecture

### External API Providers

- **GuiaEnvia (GE)** - `/ge/create-guide`
- **T1** - `/t1/create-guide`
- **Pakke (Pkk)** - `/pkk/create-guide`
- **Manuable** - `/manuable/create-guide`

### Current Flow

1. User creates guide via provider-specific endpoint
2. External API creates the guide
3. No local persistence - data retrieved on-demand from external APIs
4. `GuidesService.getGuides()` fetches from all providers simultaneously

### Technology Stack

- **Database**: MongoDB with Mongoose
- **Framework**: NestJS
- **Authentication**: JWT with role-based access (admin/user)

---

## Requirements

### 1. Guide Creation Flow

**Requirement**: Create guide via external API first, then persist to DB regardless of success/failure.

**High-Level Actions**:

- Create `Guide` entity/schema with Mongoose
- Define guide status lifecycle (created, failed, in-transit, delivered, etc.)
- **Note**: Guide cancellation is NOT part of MVP
- **Standardize guide creation payload** across all 4 providers:
  - Accept FE payload as-is (shipping details, package info, addresses)
  - Add `provider` property to specify which provider service to call
  - Ensure consistent payload structure works for GuiaEnvia, T1, Pakke, and Manuable
- Implement API-first creation logic:
  1. Extract provider from payload
  2. Call appropriate external provider API with standardized payload
  3. Save to DB regardless of API result
  4. Store appropriate status based on API response
- Handle success/failure scenarios from external APIs
- **Always generate internal Kraft tracking number** (kraftId) regardless of API success/failure
- **Store external provider tracking number** separately when provider returns one
- **Never replace kraftId** - it remains constant for the life of the guide
- Support retry for failed guides by updating existing guide record

### 2. User Guide Retrieval

**Requirement**: Get guides by user.

**High-Level Actions**:

- Create endpoint to fetch guides filtered by user ID (from JWT token)
- Implement pagination for guides lists
- Add sorting capabilities (by date, status, provider)
- **Priority filters**: Search by tracking number (internal or external), provider, date range, status
- Search functionality must check both internal Kraft tracking number AND external provider tracking number
- Users can only access their own orders (strict isolation)
- Return formatted order data with provider-specific details

### 3. Admin Access

**Requirement**: Admin users can see all guides from all users OR just their own guides.

**High-Level Actions**:

- Implement role-based query logic (admin vs user)
- Create admin-specific endpoint or extend user endpoint with role check
- **Add request parameter/query to specify scope**: `scope: 'all' | 'own'`
  - When `scope: 'all'` → Return all guides from all users
  - When `scope: 'own'` → Return only admin's own guides
  - Default behavior to be determined (likely 'all' for admin convenience)
- Return user-specific guides when role is 'user' (no scope option)
- Maintain proper authorization guards

**Admin Capabilities** (confirmed for MVP):

- View all guides from all users OR filter to their own guides
- Manually update guide status
- Same search/filter capabilities as users but across all guides (when scope='all')
- **Fetch guides by month and year** (optional parameters for admin queries)
  - Month: 1-12 (optional, defaults to current month)
  - Year: e.g., 2026 (optional, defaults to current year)
  - Default behavior: Uses current month and year if not specified

**Admin Features to Discuss with Client**:

- Add notes/comments to guides
- Bulk operations (export, status updates)
- Refund management
- Dispute resolution
- Audit log access

**Admin Features NOT in MVP**:

- Cancel guides (future enhancement)

---

## Database Design Considerations

### Guide Entity Structure

**Core Fields**:

- `_id` (MongoDB ObjectId): Internal database identifier for relationships and queries
- User reference (relationship to User entity)
- Provider identifier: 'GE' | 'TONE' | 'Pkk' | 'Mn'
- Guide status (created, failed, in-transit, delivered, etc.)
- **Note**: Cancellation features not included in MVP
- **Tracking Numbers** (Dual Reference System):
  - `kraftId` (string): **Primary Kraft tracking number** (e.g., "KFT-202605-000001")
    - **Always generated on guide creation** (regardless of provider success/failure)
    - User-facing, customer-friendly format
    - Used for customer support and guide searches
    - **Permanent - never replaced or changed**
    - Indexed and unique across entire system
  - `externalId` (string, optional): Provider's tracking number
    - Initially null when guide is created
    - Set when provider API returns successful response
    - Used for tracking with provider and sync operations
    - Indexed for fast search
    - **This is a reference only - kraftId remains the primary identifier**
  - `isProviderTrackingSynced` (boolean): Indicates if provider tracking number has been received
    - Initially false
    - Set to true when externalId is populated
    - Used for UI display logic and retry flow decisions
- Quote data reference (store selected quote information for price calculation audit)
  - Quote ID from request
  - `qAdjMode`: Adjustment mode applied (e.g., 'percentage', 'absolute')
  - `qBaseRef`: Base quote total before profit margin adjustment
  - `qAdjFactor`: Adjustment factor applied (profit margin value)
  - `qAdjBasis`: Basis value for adjustment (margin configuration value)
  - `qAdjSrcRef`: Source reference for adjustment (margin source identifier)
  - `total`: Final total price shown to customer (after profit margin)
  - Service type selected
  - Courier selected
- External provider response data (full API response)
- Creation timestamp
- Last updated timestamp
- Last sync timestamp (when status was last updated from provider)
- Guide document URL / Label URL
- **Full address storage** (origin and destination - embedded in guide)
  - Origin: Complete address details
  - Destination: Complete address details
  - Store as embedded documents (not references) for historical accuracy
- Package information (dimensions, weight, content)
- Cost information (from quote)
- Payment reference (optional - for future payment integration)
- Error details (if guide creation failed)
- Retry count (number of retry attempts)
- Soft delete support:
  - `deletedAt`: Timestamp when guide was soft-deleted (null if not deleted)
  - `deletedBy`: User ID or admin ID who deleted the guide
  - Only admins can perform hard deletes; regular users can only soft delete

### Relationships

- **User ↔ Guides**: One-to-Many
  - User has many guides
  - Guide belongs to one user

### Status Management

**Provider Status Systems**:

**T1 Statuses**:

- `estatus`: Provider-specific status string (e.g., "Guía generada")
- `estatus_generico`: Generic status (e.g., "In Process")
- `cancelada`: boolean
- `status_entrega`: number (delivery status code)
- `incidence`: number

**Pakke Statuses**:

- `Status`: 'SUCCESS' | 'REFUNDED' | 'REFUNDPENDING' | 'REFUNDFAILED'
- `TrackingStatus`: 'WAITING' | 'IN_TRANSIT' | 'ON_DELIVERY' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'EXCEPTION'

**GuiaEnvia Statuses**:

- `estado`: string (e.g., "completo")

**Manuable Statuses**:

- `tracking_status`: Currently null/undefined (check implementation)
- `label_status`: string
- `cancellable`: boolean

**Kraft Consolidated Status Flow** (to be defined during implementation):

1. `created` - Successfully created in external provider
2. `failed` - External API call failed
3. `waiting` - Waiting for pickup/processing
4. `in-transit` - Package in transit to destination
5. `on-delivery` - Out for delivery
6. `delivered` - Successfully delivered
7. `returned` - Package returned to sender
8. `exception` - Delivery exception/issue

**Note**: Guide cancellation is not part of MVP. The `cancelled` status is reserved for future implementation.

**Status Mapping Strategy**:

- Map each provider's status to Kraft's consolidated status
- Store both original provider status and Kraft status
- Update mapping as we discover new provider statuses
- Document edge cases and special status meanings per provider

---

## Module Structure

### New/Modified Modules

#### 1. Guides Module (New/Modify Existing)

**Purpose**: Central guide management and tracking

**Current State**: Guides module exists but only orchestrates external API calls

**Changes Needed**:

- `guides.module.ts` - Update to include database persistence
- `entities/guide.entity.ts` - **NEW** - Guide schema for MongoDB
- `services/guides.service.ts` - Enhance with DB operations and standardized payload handling
- `controllers/guides.controller.ts` - Update endpoints for guide creation with provider prop
- `dtos/guides.dto.ts` - **NEW** - Add DTOs for standardized guide creation payload
- `dtos/guides-responses.dto.ts` - Update response DTOs
- `guides.interface.ts` - Add TypeScript interfaces for guide entity

#### 2. Provider Modules (Modify)

**Modules**: guia-envia, t1, pakke, manuable

**Changes**:

- **Accept standardized payload** from Guides module with provider prop
- Adapt standardized payload to provider-specific format
- Update create-guide methods to work with Guides module persistence
- Return structured responses for DB persistence
- Handle idempotency
- Ensure all 4 providers can process the same base payload structure

---

## API Endpoints Design

### Guide Creation

**Endpoint**: `POST /guides/create` (existing endpoint, update implementation)
**Request Body**:

```typescript
{
  provider: 'GE' | 'TONE' | 'Pkk' | 'Mn',  // NEW: Specify which provider to use
  quoteId: string | number,  // ID from the selected quote
  // Standardized payload structure that works for all 4 providers:
  origin: { /* address details */ },
  destination: { /* address details */ },
  package: { /* dimensions, weight, content */ },
  // Additional fields as needed by providers
  // FE sends current payload structure + provider prop
}
```

**Flow**:

1. Extract user ID from JWT token
2. **Generate kraftId immediately** (before calling provider API)
3. Extract provider from payload
4. Validate request payload for selected provider
5. Call appropriate external provider create-guide API based on `provider` property
6. Create guide in DB with result:
   - **Always save kraftId** (already generated)
   - If API success: Save with status 'created' and store external provider tracking number in `externalId`
   - If API fails: Save with status 'failed', store error details, `externalId` remains null
7. Return guide data to user with kraftId

**Retry Flow** (for failed guides):

1. User triggers retry on failed guide
2. Retrieve guide data from DB (includes kraftId and stored payload)
3. Call external provider API again with stored data
4. Update existing guide record:
   - If success: Update status to 'created', store provider tracking in `externalId`, **kraftId unchanged**
   - If fail again: Keep as 'failed', increment retry count, update error details, **kraftId unchanged**

**Concurrent Guides**:

- Users CAN create multiple guides simultaneously
- No locking mechanism needed
- Each guide is independent
- Each gets unique kraftId

### User Guides Retrieval

**Endpoint**: `GET /guides/db` (NEW endpoint for database-persisted guides)
**Query Parameters**:

- `page` - Pagination
- `limit` - Results per page
- `status` - Filter by status (Priority filter)
- `provider` - Filter by provider (Priority filter)
- `startDate` - Filter by date range (Priority filter)
- `endDate` - Filter by date range (Priority filter)
- `trackingNumber` - Search by tracking number (Priority filter)
  - Must search BOTH kraftId AND externalId

**Authorization**:

- Extracts user ID from JWT token
- Returns guides belonging to authenticated user only (strict isolation)
- Users cannot see guides from other users

### Admin Guides Retrieval

**Endpoint**: `GET /guides/db/admin` (NEW endpoint for admin database queries)
**Query Parameters**: Same as user guides, plus:

- **`scope`** - **REQUIRED**: `'all'` | `'own'`
  - `'all'` → Returns guides from all users
  - `'own'` → Returns only admin's own guides
- **`month`** - Optional: Filter by month (1-12, defaults to current month)
- **`year`** - Optional: Filter by year (e.g., 2026, defaults to current year)
- Defaults to current month/year if not specified
- Optional user ID filter for admin queries when scope='all'

**Authorization**:

- Requires 'admin' role
- Returns guides based on `scope` parameter
- Month/year default to current values for performance

### Single Guide Detail

**Endpoint**: `GET /guides/db/:guideId` (NEW endpoint for database-persisted guide detail)
**Authorization**:

- User can only view their own guides
- Admin can view any guide

**On-Demand Sync Behavior**:

- When user/admin views a specific guide, trigger sync with provider
- Call provider's get-guide API to fetch latest status using externalId (if available)
- Update guide in DB with latest information
- Return updated guide data with both kraftId and externalId
- This ensures users always see current status without constant polling

---

## Quote Integration

### Current Quote System

- Quotes are **NOT** stored in the database
- Quotes are fetched from external provider APIs on-demand
- Quote data structure (from `/quotes/quotes.interface.ts`):
  - `id`: Quote identifier
  - `service`: Service name
  - `total`: **Final price shown to customer** (This is the source for order cost)
  - `courier`: Courier/provider name
  - `typeService`: 'standard' | 'nextDay'
  - `source`: Provider source (GE, T1, PKK, MANUABLE)

### Quote-to-Guide Flow

1. User requests quotes for a shipment
2. System calls all providers and returns available quotes
3. User selects a quote (which includes provider information)
4. User clicks create guide
5. Frontend sends standardized payload:
   - **Provider** (from selected quote) - NEW required field
   - Quote ID (from selected quote)
   - Shipping details (from saved address or manual input)
   - Current FE payload structure + provider prop
6. Backend:
   - Generates kraftId immediately
   - Uses quote `total` as the guide cost
   - Routes to appropriate provider service based on provider prop

### Guide Cost Strategy

- **Source of Truth**: Quote `total` field
- Store quote information in guide record:
  - Quote ID
  - Quote total (cost)
  - Selected service
  - Selected courier
- Do **NOT** rely on provider API response for cost in guide record
- Provider API response cost is for validation/audit only

---

## Service Layer Architecture

### GuidesService

**Responsibilities**:

- **Accept standardized payload with provider prop** from controller
- **Generate kraftId immediately** before any provider call
- Create guides via external API then persist to database
- Query guides with filters and search
- Update guide status from provider sync
- Coordinate with provider services based on provider prop
- Handle guide lifecycle events (creation, retry, sync)
- Maintain dual tracking reference (kraftId + externalId)
- Handle soft delete for regular users and hard delete for admins
- Manage retry attempts with rate limiting (10 attempts, 5-minute cooldown)
- Track retry history with error codes and timestamps
- Manage admin comments on guides

**Note**: This service will be implemented as `GuidesDbService` for retrocompatibility, keeping existing `GuidesService` intact for external API operations.

**Key Methods**:

- `createGuide(userId, payload)` - Extract provider, generate kraftId, call provider API, save to DB
- `retryFailedGuide(guideId, userId)` - Retry failed guide with rate limiting, update existing record, keep kraftId
- `syncGuideWithProvider(guideId)` - Fetch latest status from provider using externalId, update DB
- `getGuidesByUser(userId, filters)` - Get user guides with search/filter
- `getAllGuides(filters, scope)` - Get guides (admin) with search/filter and scope (all/own)
- `getGuidesByMonthYear(month, year, scope, userId)` - Admin query by month/year
- `getGuideById(guideId, userId, isAdmin)` - Get single guide with on-demand sync
- `updateGuideStatus(guideId, status, updatedBy)` - Manual status update (admin)
- `addComment(guideId, adminId, comment)` - Add admin comment to guide
- `generateKraftId()` - Generate custom Kraft tracking number (KFT-YYYYMM-XXXXXX format)
- `searchByTrackingNumber(trackingNumber, userId, isAdmin)` - Search both kraftId and externalId
- `checkRetryEligibility(guideId)` - Check if guide can be retried (rate limit, cooldown)
- `softDeleteGuide(guideId, userId)` - Soft delete guide (users)
- `hardDeleteGuide(guideId, adminId)` - Hard delete guide (admins only)

**Schema Fields** (Guide Entity):

- **Retry Management** (`retries` object):
  - `retryAttempts`: Array of retry objects
    - `attemptNumber`: Sequential number (1-10)
    - `timestamp`: When retry occurred
    - `userId`: Who triggered retry
    - `error`: Error message from provider
    - `errorCode`: Kraft error code (GDE-XXX-###)
  - `retryCount`: Total number of retry attempts (0-10)
  - `lastRetryAt`: Timestamp of last retry (for 5-minute cooldown check)
- **Admin Comments** (`comments` array):
  - `text`: Comment content
  - `adminId`: Admin user who added comment
  - `timestamp`: When comment was added

### Provider Service Updates

Each provider service (GuiaEnvia, T1, Pakke, Manuable) needs:

- **Accept standardized payload structure** from GuidesService
- **Adapt standardized payload to provider-specific format**
- Method to format guide data for external API
- Method to parse external API response
- Error handling for API failures
- Retry logic (existing in some modules)
- Return consistent response structure to GuidesService

---

## Error Handling Strategy

### Database Errors

- Transaction rollback on DB failures
- Proper error logging
- User-friendly error messages

### External API Errors

- Store error details in guide record
- Mark guide status as 'failed'
- Provide retry mechanism
- Maintain audit trail of attempts
- **kraftId persists even when API fails**

### Authorization Errors

- Proper HTTP status codes (401, 403)
- Clear error messages
- Prevent data leakage

---

## Standardized Payload Structure

### Guide Creation Payload

The system accepts a standardized payload structure that works across all 4 providers (GuiaEnvia, T1, Pakke, Manuable):

```typescript
type ProviderCreateGuide = 'Mn' | 'GE' | 'Pkk' | 'TONE';
type CreateGuideAddressPayload = {
  alias: string;
  name: string; // customer's name
  lastName: string;
  phone: string;
  email: string;
  company: string;
  street1: string;
  street2?: string;
  isResidential?: boolean; // defaulted to false
  external_number: string;
  neighborhood: string;
  city: string;
  town: string;
  state: string;
  zipcode: string;
  country: string;
  reference: string;
};

type CreateGuidePayload = {
  provider: 'GE' | 'TONE' | 'Pkk' | 'Mn'; // Specify which provider to use
  quoteId: string; // used in GE, Mn and TONE (quoteToken)
  parcel: {
    length: string;
    width: string;
    height: string;
    weight: string;
    content: string;
    satProductId: string;
    value: number;
    quantity: number;
  };
  origin: CreateGuideAddressPayload;
  destination: CreateGuideAddressPayload;
  notifyMe: boolean; // only for TONE
  provider: ProviderCreateGuide;
};
```

**Key Points**:

- `provider` field routes request to appropriate provider service
- `quoteId` references the selected quote from quote selection flow
- Address structure standardized across all providers
- Provider-specific fields (like `notifyMe` for T1) included in base payload
- Backend adapts this payload to provider-specific format

---

## Custom Error Code System

The project implements a standardized error code system for consistent error handling across all modules. Error codes use French-based abbreviations for obfuscation while remaining meaningful to the development team.

**Format**: `MODULE-TYPE-CODE` (e.g., `CMD-DB-001`, `DVS-EXT-042`, `GDE-PVR-015`)

**Key Features**:

- Standardized error responses with user-friendly messages
- Module-specific error codes (CMD=Orders, DVS=Quotes, GDE=Guides, etc.)
- Category-based error types (DB, PVR, NET, TMOT, RLIM, etc.)
- Technical details for logging and debugging
- Centralized error handling with `KraftError` class and filter
- French-based module codes for security through obscurity

### Guides Module Error Codes (GDE-XXX-###)

The Guides module uses the following error type categories:

| Error Type           | Code | Module Prefix | Description                   | User-Friendly Message Example                                    |
| -------------------- | ---- | ------------- | ----------------------------- | ---------------------------------------------------------------- |
| Provider API Error   | PVR  | GDE-PVR-###   | External provider API failed  | "Unable to create guide with provider. Please try again."        |
| Network Error        | NET  | GDE-NET-###   | Network/connection error      | "Network connection error. Please check your connection."        |
| Timeout Error        | TMOT | GDE-TMOT-###  | Provider request timeout      | "Request timed out. Please try again."                           |
| Rate Limit Error     | RLIM | GDE-RLIM-###  | Rate limit exceeded (retries) | "Too many attempts. Please wait 5 minutes before trying again."  |
| Database Error       | BDN  | GDE-BDN-###   | MongoDB operation failed      | "Unable to save guide. Please try again or contact support."     |
| Authorization Error  | AUTH | GDE-AUTH-###  | Permission denied             | "You don't have permission to perform this action."              |
| Not Found Error      | NF   | GDE-NF-###    | Guide not found               | "Guide not found. Please check the tracking number."             |
| Business Logic Error | BUS  | GDE-BUS-###   | Business rule violation       | "Unable to perform this action. Guide status does not allow it." |

**Error Display Strategy**:

- **Never show technical errors** from providers to users
- **Always show kraftId** for user reference and support
- **Display different user-friendly messages** based on error type
- **No troubleshooting suggestions** (keep messages simple)
- **Log full technical details** server-side for debugging

For complete error code documentation, implementation guidelines, error code registry, and maintenance procedures, see:

**→ [Error Code System Research](./error-code-system-research.md)**

---

## Data Synchronization Strategy

### Initial Creation

1. **Generate kraftId First**: Always generate Kraft tracking number before any provider call
2. **API Call**: Call external provider API based on provider prop
3. **DB Persistence**: Save guide to database regardless of API result
4. **Status Assignment**: Set status based on API response
   - Success: 'created' with provider tracking number in externalId, kraftId already set
   - Failure: 'failed' with kraftId only, externalId null, store error details

### On-Demand Sync (Primary Strategy)

- **Trigger**: When user/admin views a specific guide detail
- **Process**:
  1. Fetch guide from DB (includes kraftId and externalId)
  2. If externalId exists, call provider's get-guide API for latest status
  3. Update DB with latest tracking information
  4. Update guide status if changed
  5. Update lastSyncTimestamp
  6. Return updated data with both tracking numbers
- **Benefits**:
  - No polling overhead
  - Always fresh data when user needs it
  - Reduces API calls to providers
  - Better user experience (see updates immediately)

### Periodic Sync (Future Enhancement)

- Background job to sync guide status for recent/in-transit guides
- Update tracking information for guides in active delivery states
- Sync delivery status using externalId
- Handle provider-initiated updates (webhooks if available)
- Consider rate limiting to avoid hitting provider API limits

---

## Migration Considerations

### Backward Compatibility

**Retrocompatibility Strategy**:

- **Existing endpoints preserved**: Current `GET /guides` continues to fetch from external APIs (no changes)
- **New endpoints created**:
  - `POST /guides/db/create` - Create guide with DB persistence
  - `GET /guides/db` - Fetch guides from database
  - `GET /guides/db/admin` - Admin queries from database
  - `GET /guides/db/:guideId` - Single guide detail from database
- **New service layer**: Create `GuidesDbService` for database operations, separate from existing `GuidesService`
- **Frontend flexibility**: FE can use old endpoints (external APIs) OR new endpoints (database)
- **No breaking changes**: All existing functionality remains intact
- **Gradual migration**: Teams can migrate features incrementally to database-backed endpoints

### Historical Data

- No historical guides exist in DB
- All guides going forward will be persisted with kraftId and externalId
- Optional: Backfill historical data from external APIs (if tracking numbers available)

---

## Security Considerations

### Data Access Control

- Users can only access their own guides
- Admin role required for global access (with scope parameter)
- Proper JWT validation on all endpoints
- Admin can choose to view all guides or only their own

### Sensitive Data

- Secure storage of customer information
- Address data protection
- Payment/cost information security
- Tracking numbers (both kraftId and externalId) properly indexed and secured

### API Key Management

- Provider API keys remain in environment config
- No exposure of keys in responses
- Secure handling in service layer

---

## Address Integration

### Existing Addresses Feature

- Users can save addresses in the system (see `/addresses` module)
- Saved addresses contain all information needed for guide creation across all providers
- Different providers require different fields from the saved address

### Address-to-Guide Flow

1. User selects a saved address (or enters manually)
2. Frontend formats address data according to provider requirements
3. **Provider-specific payload + provider prop** sent to backend in guide creation request
4. Backend stores **full address data** (origin + destination) in guide record
5. Backend uses standardized payload structure to call appropriate provider

### Why Embed Address Data in Guides

- **Historical Accuracy**: Address may be modified/deleted after guide creation
- **Audit Trail**: Complete record of what address was used
- **Independence**: Guide data is self-contained
- **Compliance**: Shipping records often required for legal purposes

### Address Data Storage Strategy

- Store complete address object (embedded document)
- Include all fields even if not used by specific provider
- Preserve original address format as provided
- Store both origin and destination addresses
- Do NOT reference Address entity - copy the data

---

## Testing Strategy

### Unit Tests

- Guide service methods (including kraftId generation)
- Provider service integration with standardized payloads
- Status transition logic
- Role-based access logic with scope parameter
- Tracking number search (kraftId and externalId)

### Integration Tests

- End-to-end guide creation flow with standardized payload
- Database persistence verification (kraftId always present)
- External API mocking
- Authorization scenarios (including admin scope parameter)
- Provider prop routing logic

### E2E Tests

- Complete user journey
- Admin access scenarios
- Error handling flows

---

## Performance Considerations

### Database Queries

- Index on user ID for fast user guide retrieval
- Index on status for status-based queries
- Index on creation date for sorting
- **Index on kraftId** (unique) for fast customer-facing searches - PRIMARY
- **Index on externalId** (sparse, allows nulls) for provider tracking searches
- Compound indexes for common query patterns (userId + status, userId + createdAt)
- Consider text index if implementing full-text search across guide fields
- Month/year indexes for admin queries

### API Response Times

- Pagination to limit data transfer
- Efficient query construction
- Consider caching for frequently accessed data

### External API Timeouts

- Set appropriate timeout values
- Implement retry mechanisms
- Handle slow provider responses

---

## Future Enhancements

### Webhook Integration

- Receive updates from providers
- Real-time status updates
- Automatic sync without polling
- Update guide status via externalId

### Advanced Filtering

- Multi-status filtering
- Complex date range queries
- Provider-specific filters
- Combined kraftId/externalId search

### Reporting

- Guide analytics
- Provider performance metrics
- User activity reports
- kraftId vs externalId success rates

### Notifications

- Email notifications on guide status changes
- SMS notifications for delivery
- Push notifications
- Include kraftId in all customer communications

---

## Technical Decisions Needed

1. **Guide ID Format**: MongoDB ObjectId vs custom format?
   - **✅ DECIDED**: Use MongoDB ObjectId for database operations + Custom kraftId for customer-facing operations
   - **kraftId Format**: `KFT-{YEAR}{MONTH}-{SEQUENCE}` (e.g., KFT-202605-000001)
   - **Rationale**: Provides user-friendly tracking numbers while maintaining MongoDB efficiency
   - **Properties**:
     - `_id`: MongoDB ObjectId (internal use)
     - `kraftId`: Custom sequential tracking number (**ALWAYS PRESENT**, indexed, unique, **NEVER REPLACED**)
     - `externalId`: Provider tracking number (optional, indexed, populated on provider success)
     - `isProviderTrackingSynced`: Boolean flag indicating if externalId is populated
2. **Status Enum**: Comprehensive list of all possible statuses?
   - **Defined**: See Status Management section (created, failed, waiting, in-transit, on-delivery, delivered, returned, exception)
   - **Note**: `cancelled` status reserved for future (not MVP)
   - **Action**: Map provider statuses to Kraft statuses during implementation
3. **Provider Data Storage**: Embed vs reference external provider data?
   - **✅ Decided**: Embed full provider response for audit and historical accuracy
4. **Retry Logic**: Automatic vs manual retry for failed guides?
   - **✅ Decided**: Manual retry triggered by user; updates existing guide record, kraftId unchanged
5. **Soft Delete**: Should guides be soft-deleted or hard-deleted?
   - **✅ DECIDED**: Regular users can only soft delete (sets `deletedAt` timestamp); only admins can hard delete
6. **Audit Trail**: Track all changes to guide status?
   - **✅ DECIDED**: Manual status updates by admin will be tracked via comments system, no separate statusHistory needed for MVP
7. **Provider Selection**: How does user select provider during creation?
   - **✅ Decided**: Provider is selected via quote selection AND included in payload as `provider` prop
   - **Provider values**: 'GE' | 'TONE' | 'Pkk' | 'Mn'
8. **Cost Calculation**: Store in DB or calculate on-demand?
   - **✅ Decided**: Store cost from quote `total` field in guide record
9. **Tracking Number Generation**: Format for internal Kraft tracking numbers?
   - **✅ DECIDED**: Sequential format `KFT-{YEAR}{MONTH}-{SEQUENCE}`
   - Six-digit sequence resets monthly
   - User-friendly and professional appearance
   - Easy to communicate with customer support
   - **Generated immediately, never replaced**
10. **Duplicate Prevention**: Additional safeguards beyond FE button disable?
    - **Need Decision**: Idempotency keys? Check for recent duplicate guides?
11. **Error Message Display**: Show provider error or friendly message?
    - **Need Client Decision**: See Questions for Client section
12. **Admin Audit Log**: Log all admin actions on guides?
    - **Recommendation**: Yes, track who updated/deleted guides
13. **Standardized Payload Structure**: What fields are required across all providers?
    - **Need Decision**: Define minimal set of fields that work for all 4 providers
    - **Priority**: Document current FE payload structure and map to provider requirements
14. **Admin Default Scope**: When admin queries guides without scope parameter?
    - **✅ DECIDED**: Scope is REQUIRED - admin must explicitly choose 'all' or 'own'
15. **Admin Month/Year Parameters**: Default behavior for temporal filters?
    - **✅ DECIDED**: Month and year are OPTIONAL - default to current month/year if not specified
16. **Retrocompatibility**: How to support both old and new flows?
    - **✅ DECIDED**: Create new endpoints (`/guides/db/*`) and new service (`GuidesDbService`), preserve existing endpoints
17. **Guide Cancellation**: Part of MVP?
    - **✅ DECIDED**: NOT part of MVP - future enhancement only

---

## Questions for Client

The following questions need client input before finalizing implementation:

### 1. Guide Cancellation

**Status**: NOT PART OF MVP - Future enhancement

**Questions for Future Implementation**:

- At what point can guides no longer be cancelled?
- Do we need to call the external provider's cancel API?
- What happens to the guide in our system (status change to 'cancelled')?
- Should cancellation be free or are there fees?
- kraftId remains unchanged when guide is cancelled

**Impact**: Affects API design, provider integration, and status workflow.

### 2. Failed Guide Retry Behavior

**✅ DECIDED**:

- **Unlimited retry times**: Users can retry as many times as needed
- **Rate limiting**: Maximum 10 retry attempts, with 5-minute cooldown between attempts
- **Tracking**: Track each retry attempt with:
  - Error returned from provider
  - Timestamp of retry
  - User who triggered retry
- **Alternative providers**: Do NOT suggest alternative providers
- **kraftId persistence**: kraftId remains the same across all retry attempts

**Impact**: Requires retry attempt counter, cooldown tracking, and retry history in guide schema.

### 3. Guide Editing Capability

**✅ DECIDED**: NOT PART OF MVP

- Guide editing is not part of this development work
- Users cannot edit guide details after creation
- Future enhancement only

**Impact**: Simplifies MVP implementation - no edit endpoints or provider update logic needed.

### 4. Error Message Display

**✅ DECIDED**:

- **DO NOT** show technical error from provider to user
- **Show user-friendly generic message**: YES
- **Different messages for different error types**: YES
  - Provider API error
  - Network error
  - Validation error (invalid payload data)
  - Timeout error (provider took too long)
  - Rate limit error (too many requests to provider)
  - Database error (rare, for saving guide data)
- **Troubleshooting suggestions**: NO
- **Always show kraftId**: YES (for user reference and support)

**Impact**: Requires error type classification and user-friendly message mapping in error handling system.

### 5. Admin Guide Creation

**✅ DECIDED**: NOT PART OF MVP

- Admins cannot create guides on behalf of users (adds complexity)
- Future enhancement only

**Impact**: Simplifies MVP implementation - no admin guide creation endpoints needed.

### 6. Admin Actions and Permissions

**✅ DECIDED**:

- **Add notes/comments to guides**: YES
  - Add `comments` property to guide schema
  - Array of comment objects with timestamp, admin user, and text
- **Issue refunds**: NOT part of MVP
- **Override guide status manually**: YES
  - Admin can manually update guide status
  - Track who changed status and when
- **Delete guides permanently (hard delete)**: YES
  - Admins can hard delete
  - Regular users can only soft delete
- **View sensitive customer data**: NO sensitive data stored
  - Only payment reference stored (not sensitive)
- **Search guides by kraftId or externalId**: YES
  - Search capability for BOTH tracking numbers
  - Available for both admins and normal users

**Impact**: Requires comment system, manual status override endpoint, and dual tracking number search functionality.

### 7. Notification Preferences

**✅ DECIDED**: NOT PART OF MVP

- Notification system is not part of this development work
- **Future enhancement**: Email notifications only
- Will be implemented in later development phase

**Impact**: No notification system implementation needed for MVP.

### 8. Guide History and Retention

**✅ DECIDED**: NOT PART OF MVP

- **Keep all guides indefinitely**: YES (no archival needed for MVP)
- Data retention and archival strategy will be addressed in future development
- **kraftId immutability**: kraftId must NEVER be modified after guide creation

**Impact**: No archival job implementation needed for MVP.

### 9. Refund and Dispute Process

**✅ DECIDED**: NOT PART OF MVP

- Refund and dispute handling is not part of this development work
- Future enhancement only

**Impact**: No refund system implementation needed for MVP.

---

## Technical Decisions Made (Summary)

### ✅ Confirmed Decisions

1. **Guide Creation Flow**: Generate kraftId first → Call external API based on provider prop → Save to DB (always, regardless of result)
2. **Tracking Numbers**: Dual reference system with three properties:
   - `kraftId`: Custom Kraft tracking (KFT-202605-XXXXXX) - **ALWAYS PRESENT, NEVER REPLACED**
   - `externalId`: Provider tracking number - populated on successful provider response
   - `isProviderTrackingSynced`: Boolean flag for sync status
3. **ID Strategy**: MongoDB ObjectId for DB operations, kraftId for customer-facing (permanent identifier)
4. **Cost Source**: Quote `total` field
5. **Address Storage**: Full address data embedded in guide
6. **User Isolation**: Strict - users see only their guides
7. **Admin Visibility**: Admins choose scope ('all' or 'own') with required month/year filters
8. **Retry Strategy**: Manual retry, updates existing guide, **kraftId unchanged**
9. **Concurrent Guides**: Allowed - no locking, each gets unique kraftId
10. **Sync Strategy**: On-demand when viewing guide detail using externalId
11. **Quote Storage**: Not stored in DB
12. **Provider Credentials**: System-wide (not per-user)
13. **Historical Data**: No backfill - start fresh
14. **Payment Integration**: Optional payment reference field for future
15. **Notifications**: Not implemented in MVP (kraftId will be used in all customer communications)
16. **Admin Bulk Operations**: Not in MVP
17. **Standardized Payload**: FE payload + provider prop, works across all 4 providers
18. **Admin Month/Year Filters**: Optional (defaults to current month/year) for performance
19. **Delete Permissions**: Who can hard delete vs soft delete?
    - **✅ DECIDED**: Regular users can only soft delete; admins can hard delete
20. **Quote Price Audit**: What quote calculation data to store?
    - **✅ DECIDED**: Store complete price calculation data (qAdjMode, qBaseRef, qAdjFactor, qAdjBasis, qAdjSrcRef, total)
21. **Failed Guide Retry Policy**: Retry limits and tracking?
    - **✅ DECIDED**: Unlimited retries, max 10 attempts with 5-minute cooldown, track each attempt with error and timestamp
22. **Guide Editing**: Can users edit guides after creation?
    - **✅ DECIDED**: NOT part of MVP - future enhancement only
23. **Error Message Display**: Technical vs user-friendly messages?
    - **✅ DECIDED**: User-friendly messages only, different messages per error type (API, network, validation, timeout, rate limit, DB), always show kraftId
24. **Admin Guide Creation**: Can admins create on behalf of users?
    - **✅ DECIDED**: NOT part of MVP - too complex
25. **Admin Comments**: Can admins add notes to guides?
    - **✅ DECIDED**: YES - add comments array property with timestamp, admin user, and text
26. **Manual Status Override**: Can admins change guide status?
    - **✅ DECIDED**: YES - track who changed status and when
27. **Tracking Number Search**: Search by kraftId or externalId?
    - **✅ DECIDED**: BOTH - available for admins and normal users
28. **Notifications**: Email/SMS for guide events?
    - **✅ DECIDED**: NOT part of MVP - email notifications only in future development
29. **Guide Retention**: How long to keep guide data?
    - **✅ DECIDED**: Keep indefinitely, archival not part of MVP
30. **Refund System**: Track refunds in guide?
    - **✅ DECIDED**: NOT part of MVP - future enhancement only

### ⏳ Pending Client Decisions

All critical decisions have been made. Ready to proceed to planning phase.

**Future Considerations** (not blocking):

- Compliance or legal requirements for guide data retention
- Archival strategy (future enhancement)
- Notification system implementation (future enhancement)

---

## Dependencies

### Required Packages (Already Installed)

- `@nestjs/mongoose` - MongoDB integration
- `mongoose` - MongoDB ODM
- `@nestjs/jwt` - JWT authentication
- `@nestjs/swagger` - API documentation

### Provider Modules

- GuiaEnviaModule
- T1Module
- PakkeModule
- ManuableModule

### Shared Modules

- AuthModule (for guards and decorators)
- DatabaseModule (MongoDB connection)

---

## Summary

This implementation will transform the system from an API proxy to a data-centric application where:

- **Database is source of truth** for guide data
- **External APIs serve as execution mechanisms** for guide creation
- **kraftId is generated immediately** and serves as permanent customer-facing identifier
- **externalId references provider tracking** but never replaces kraftId
- **Standardized payload with provider prop** enables consistent guide creation across all 4 providers (GE, TONE, Pkk, Mn)
- **Users have full visibility** of their guide history with strict isolation
- **Admins have flexible access** with scope parameter ('all' or 'own') and optional month/year filters (default to current)
- **System is resilient** to external API failures (stores failed guides with kraftId for retry)
- **Data is structured** for future analytics and reporting
- **Dual tracking reference system** (kraftId + externalId) ensures no guide is lost
- **On-demand synchronization** keeps data fresh without excessive API calls using externalId
- **Quote integration** provides accurate cost tracking from user selection
- **Full address embedding** maintains historical accuracy and compliance
- **Provider routing** via payload prop simplifies FE integration

### Key Implementation Principles

1. **KraftId First**: Always generate Kraft tracking number (kraftId) before any provider call, never replace it
2. **Standardized Payload**: Accept FE payload + provider prop, route to appropriate provider service
3. **Always Persist**: Save guides regardless of API success/failure with kraftId
4. **User Isolation**: Strict data access control per user
5. **Transparent Retry**: Failed guides can be retried using stored data, kraftId remains constant
6. **On-Demand Sync**: Fetch latest status via externalId when user views guide details
7. **Audit Trail**: Track status changes and admin actions with kraftId reference
8. **Provider Agnostic**: Design supports all four providers with standardized payload structure
9. **Admin Scope Control**: Admins explicitly choose 'all' or 'own' guides with optional month/year filters (default to current)
10. **Dual Tracking Reference**: kraftId (permanent) + externalId (reference only)

### Pending Client Decisions

- Failed guide retry limits and policies
- Guide editing capabilities and restrictions
- Error message display strategy (technical vs user-friendly)
- Admin guide creation on behalf of users
- Additional admin capabilities and audit requirements
- Guide retention and archival policies
- Refund and dispute handling processes
- Standardized payload field requirements for all 4 providers
- Guide cancellation workflow (future enhancement, not MVP)

The research provides a comprehensive foundation for implementation. Next step is to create a detailed technical plan with specific tasks, database schemas, API contracts, and **standardized payload structure definition**.
