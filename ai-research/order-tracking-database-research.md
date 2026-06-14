# Order Tracking Database Research

## Overview

This document outlines the high-level actions needed to implement order/guide tracking in the database. The system will transition from using external APIs as the sole source of truth to using the database as the primary storage, with external APIs serving as sync mechanisms.

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
- Define order status lifecycle (created, failed, in-transit, delivered, cancelled, etc.)
- Implement API-first creation logic:
  1. Call external provider API with quote data
  2. Save to DB regardless of API result
  3. Store appropriate status based on API response
- Handle success/failure scenarios from external APIs
- Generate internal Kraft tracking number if provider fails to provide one
- Replace internal tracking number when provider returns one (provider tracking is source of truth)
- Support retry for failed orders by updating existing order record

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

**Requirement**: Admin users can see all guides from all users including their own.

**High-Level Actions**:

- Implement role-based query logic (admin vs user)
- Create admin-specific endpoint or extend user endpoint with role check
- Return all orders when user role is 'admin'
- Return user-specific orders when role is 'user'
- Maintain proper authorization guards

**Admin Capabilities** (confirmed for MVP):

- View all guides from all users
- Cancel any guide
- Manually update guide status
- Same search/filter capabilities as users but across all guides
- Fetch guides by month and year (defaults to current month if not specified)

**Admin Features to Discuss with Client**:

- Add notes/comments to guides
- Bulk operations (export, status updates)
- Refund management
- Dispute resolution
- Audit log access

---

## Database Design Considerations

### Order Entity Structure

**Core Fields**:

- `_id` (MongoDB ObjectId): Internal database identifier for relationships and queries
- User reference (relationship to User entity)
- Provider identifier (guia-envia, t1, pakke, manuable)
- Order status (created, failed, in-transit, delivered, cancelled, etc.)
- **Tracking Numbers** (Dual System):
  - `kraftId` (string): Custom Kraft tracking number (e.g., "KFT-202605-000001")
    - Always generated on order creation
    - User-facing, customer-friendly format
    - Used for customer support and order searches
    - Indexed and unique across entire system
  - `externalId` (string, optional): Provider's tracking number
    - Initially null/undefined when order is created
    - Set when provider API returns successful response
    - Used for tracking with provider and sync operations
    - Indexed for fast search
  - `isProviderTrackingSynced` (boolean): Indicates if provider tracking number has been received
    - Initially false
    - Set to true when externalId is populated
    - Used for UI display logic and retry flow decisions
- Quote data reference (store selected quote information)
  - Quote ID from request
  - Quote cost (total price shown to customer)
  - Service type selected
  - Courier selected
- External provider response data (full API response)
- Creation timestamp
- Last updated timestamp
- Last sync timestamp (when status was last updated from provider)
- Guide document URL / Label URL
- **Full address storage** (origin and destination - embedded in order)
  - Origin: Complete address details
  - Destination: Complete address details
  - Store as embedded documents (not references) for historical accuracy
- Package information (dimensions, weight, content)
- Cost information (from quote)
- Payment reference (optional - for future payment integration)
- Error details (if order creation failed)
- Retry count (number of retry attempts)
- Cancellation details (if cancelled)
  - Cancelled by (user ID or admin ID)
  - Cancellation timestamp
  - Cancellation reason

### Relationships

- **User ↔ Orders**: One-to-Many
  - User has many orders
  - Order belongs to one user

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
7. `cancelled` - Order cancelled (by user or admin)
8. `returned` - Package returned to sender
9. `exception` - Delivery exception/issue

**Status Mapping Strategy**:

- Map each provider's status to Kraft's consolidated status
- Store both original provider status and Kraft status
- Update mapping as we discover new provider statuses
- Document edge cases and special status meanings per provider

---

## Module Structure

### New/Modified Modules

#### 1. Orders Module (New)

**Purpose**: Central order management

- `orders.module.ts` - Module definition
- `entities/order.entity.ts` - Order schema
- `services/orders.service.ts` - Business logic
- `controllers/orders.controller.ts` - API endpoints
- `dtos/orders.dto.ts` - Data transfer objects
- `orders.interface.ts` - TypeScript interfaces

#### 2. Guides Module (Modify)

**Current**: Orchestrates external API calls for guide retrieval
**Future**: May be deprecated or repurposed for sync operations

#### 3. Provider Modules (Modify)

**Modules**: guia-envia, t1, pakke, manuable
**Changes**:

- Update create-guide methods to work with Orders module
- Return structured responses for DB persistence
- Handle idempotency

---

## API Endpoints Design

### Order Creation

**Endpoint**: `POST /orders/create`
**Request Body**:

```typescript
{
  quoteId: string | number,  // ID from the selected quote
  provider: 'guia-envia' | 't1' | 'pakke' | 'manuable',
  shippingDetails: { /* provider-specific payload from saved address */ }
}
```

**Flow**:

1. Extract user ID from JWT token
2. Validate request payload
3. Call external provider create-guide API
4. Create order in DB with result:
   - If API success: Save with status 'created' and provider tracking number
   - If API fails: Save with status 'failed', generate internal Kraft tracking number, store error details
5. Return order data to user

**Retry Flow** (for failed orders):

1. User triggers retry on failed order
2. Retrieve order data from DB
3. Call external provider API again with stored data
4. Update existing order record:
   - If success: Update status to 'created', replace internal tracking with provider tracking
   - If fail again: Keep as 'failed', increment retry count, update error details

**Concurrent Orders**:

- Users CAN create multiple orders simultaneously
- No locking mechanism needed
- Each order is independent

### User Orders Retrieval

**Endpoint**: `GET /orders` or `GET /orders/my-orders`
**Query Parameters**:

- `page` - Pagination
- `limit` - Results per page
- `status` - Filter by status (Priority filter)
- `provider` - Filter by provider (Priority filter)
- `startDate` - Filter by date range (Priority filter)
- `endDate` - Filter by date range (Priority filter)
- `trackingNumber` - Search by tracking number (Priority filter)
  - Must search BOTH internal Kraft tracking number AND external provider tracking number

**Authorization**:

- Extracts user ID from JWT token
- Returns orders belonging to authenticated user only (strict isolation)
- Users cannot see orders from other users

### Admin Orders Retrieval

**Endpoint**: `GET /orders/all` or same endpoint with role detection
**Query Parameters**: Same as user orders, plus:

- `month` - Filter by month (1-12, optional)
- `year` - Filter by year (e.g., 2026, optional)
- **Default behavior**: If month/year not provided, returns orders from current month
- Can specify year without month to get all orders for that year
- Month requires year to be specified

**Authorization**:

- Requires 'admin' role
- Returns all orders from all users
- Optional user ID filter for admin queries

### Single Order Detail

**Endpoint**: `GET /orders/:orderId`
**Authorization**:

- User can only view their own orders
- Admin can view any order

**On-Demand Sync Behavior**:

- When user/admin views a specific order, trigger sync with provider
- Call provider's get-guide API to fetch latest status
- Update order in DB with latest information
- Return updated order data
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

### Quote-to-Order Flow

1. User requests quotes for a shipment
2. System calls all providers and returns available quotes
3. User selects a quote (which includes provider information)
4. User clicks create order
5. Frontend sends:
   - Quote ID (from selected quote)
   - Provider (from selected quote)
   - Shipping details (from saved address or manual input)
6. Backend uses quote `total` as the order cost

### Order Cost Strategy

- **Source of Truth**: Quote `total` field
- Store quote information in order record:
  - Quote ID
  - Quote total (cost)
  - Selected service
  - Selected courier
- Do **NOT** rely on provider API response for cost in order record
- Provider API response cost is for validation/audit only

---

## Service Layer Architecture

### OrdersService

**Responsibilities**:

- Create orders via external API then persist to database
- Query orders with filters and search
- Update order status from provider sync
- Coordinate with provider services
- Handle order lifecycle events (creation, retry, cancellation, sync)
- Generate internal Kraft tracking numbers when needed

**Key Methods**:

- `createOrder(userId, quoteData, provider, payload)` - Call ext API, then save to DB
- `retryFailedOrder(orderId, userId)` - Retry failed order, update existing record
- `syncOrderWithProvider(orderId)` - Fetch latest status from provider, update DB
- `getOrdersByUser(userId, filters)` - Get user orders with search/filter
- `getAllOrders(filters)` - Get all orders (admin) with search/filter
- `getOrderById(orderId, userId, isAdmin)` - Get single order with on-demand sync
- `updateOrderStatus(orderId, status, updatedBy)` - Manual status update (admin)
- `cancelOrder(orderId, userId, isAdmin, reason)` - Cancel order
- `generateKraftId()` - Generate custom Kraft tracking number (KFT-YYYYMM-XXXXXX format)
- `searchByTrackingNumber(trackingNumber, userId, isAdmin)` - Search both kraftId and externalId

### Provider Service Updates

Each provider service (GuiaEnvia, T1, Pakke, Manuable) needs:

- Method to format order for external API
- Method to parse external API response
- Error handling for API failures
- Retry logic (existing in some modules)

---

## Error Handling Strategy

### Database Errors

- Transaction rollback on DB failures
- Proper error logging
- User-friendly error messages

### External API Errors

- Store error details in order record
- Mark order status as 'failed'
- Provide retry mechanism
- Maintain audit trail of attempts

### Authorization Errors

- Proper HTTP status codes (401, 403)
- Clear error messages
- Prevent data leakage

---

## Custom Error Code System

The project implements a standardized error code system for consistent error handling across all modules. Error codes use French-based abbreviations for obfuscation while remaining meaningful to the development team.

**Format**: `MODULE-TYPE-CODE` (e.g., `CMD-DB-001`, `DVS-EXT-042`, `AUT-VAL-015`)

**Key Features**:

- Standardized error responses with user-friendly messages
- Module-specific error codes (CMD=Orders, DVS=Quotes, AUT=Auth, etc.)
- Category-based error types (DB, VAL, EXT, AUTH, BUS, NF, etc.)
- Technical details for logging and debugging
- Centralized error handling with `KraftError` class and filter
- French-based module codes for security through obscurity

For complete error code documentation, implementation guidelines, error code registry, and maintenance procedures, see:

**→ [Error Code System Research](./error-code-system-research.md)**

---

## Data Synchronization Strategy

### Initial Creation

1. **API First**: Call external provider API
2. **DB Persistence**: Save order to database regardless of API result
3. **Status Assignment**: Set status based on API response
   - Success: 'created' with provider tracking number
   - Failure: 'failed' with internal Kraft tracking number and error details

### On-Demand Sync (Primary Strategy)

- **Trigger**: When user/admin views a specific order detail
- **Process**:
  1. Fetch order from DB
  2. Call provider's get-guide API for latest status
  3. Update DB with latest tracking information
  4. Update order status if changed
  5. Update lastSyncTimestamp
  6. Return updated data to user
- **Benefits**:
  - No polling overhead
  - Always fresh data when user needs it
  - Reduces API calls to providers
  - Better user experience (see updates immediately)

### Periodic Sync (Future Enhancement)

- Background job to sync order status for recent/in-transit orders
- Update tracking information for orders in active delivery states
- Sync delivery status
- Handle provider-initiated updates (webhooks if available)
- Consider rate limiting to avoid hitting provider API limits

---

## Migration Considerations

### Backward Compatibility

- Existing provider endpoints may remain functional
- Gradual migration to new order-centric endpoints
- Support both flows during transition period

### Historical Data

- No historical orders exist in DB
- All orders going forward will be persisted
- Optional: Backfill historical data from external APIs

---

## Security Considerations

### Data Access Control

- Users can only access their own orders
- Admin role required for global access
- Proper JWT validation on all endpoints

### Sensitive Data

- Secure storage of customer information
- Address data protection
- Payment/cost information security

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

### Address-to-Order Flow

1. User selects a saved address (or enters manually)
2. Frontend formats address data according to provider requirements
3. Provider-specific payload is sent to backend in order creation request
4. Backend stores **full address data** (origin + destination) in order record

### Why Embed Address Data in Orders

- **Historical Accuracy**: Address may be modified/deleted after order creation
- **Audit Trail**: Complete record of what address was used
- **Independence**: Order data is self-contained
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

- Order service methods
- Provider service integration
- Status transition logic
- Role-based access logic

### Integration Tests

- End-to-end order creation flow
- Database persistence verification
- External API mocking
- Authorization scenarios

### E2E Tests

- Complete user journey
- Admin access scenarios
- Error handling flows

---

## Performance Considerations

### Database Queries

- Index on user ID for fast user order retrieval
- Index on status for status-based queries
- Index on creation date for sorting
- **Index on kraftId** (unique) for fast customer-facing searches
- **Index on externalId** (sparse, allows nulls) for provider tracking searches
- Compound indexes for common query patterns (userId + status, userId + createdAt)
- Consider text index if implementing full-text search across order fields

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

### Advanced Filtering

- Multi-status filtering
- Complex date range queries
- Provider-specific filters

### Reporting

- Order analytics
- Provider performance metrics
- User activity reports

### Notifications

- Email notifications on order status changes
- SMS notifications for delivery
- Push notifications

---

## Implementation Phases

### Phase 1: Core Infrastructure

- Create Order entity/schema
- Set up Orders module structure
- Implement basic CRUD operations

### Phase 2: Provider Integration

- Update GuiaEnvia service
- Update T1 service
- Update Pakke service
- Update Manuable service

### Phase 3: API Endpoints

- Implement order creation endpoint
- Implement user orders retrieval
- Implement admin orders retrieval
- Implement single order detail

### Phase 4: Authorization & Security

- Role-based access control
- Proper error handling
- Data validation

### Phase 5: Testing & Documentation

- Unit tests
- Integration tests
- API documentation
- Deployment

---

## Technical Decisions Needed

1. **Order ID Format**: MongoDB ObjectId vs custom format?
   - **✅ DECIDED**: Use both - MongoDB ObjectId for database operations + Custom kraftId for customer-facing operations
   - **kraftId Format**: `KFT-{YEAR}{MONTH}-{SEQUENCE}` (e.g., KFT-202605-000001)
   - **Rationale**: Provides user-friendly tracking numbers while maintaining MongoDB efficiency
   - **Properties**:
     - `_id`: MongoDB ObjectId (internal use)
     - `kraftId`: Custom sequential tracking number (always present, indexed, unique)
     - `externalId`: Provider tracking number (optional, indexed)
     - `isProviderTrackingSynced`: Boolean flag indicating if externalId is populated
2. **Status Enum**: Comprehensive list of all possible statuses?
   - **Defined**: See Status Management section (created, failed, waiting, in-transit, on-delivery, delivered, cancelled, returned, exception)
   - **Action**: Map provider statuses to Kraft statuses during implementation
3. **Provider Data Storage**: Embed vs reference external provider data?
   - **✅ Decided**: Embed full provider response for audit and historical accuracy
4. **Retry Logic**: Automatic vs manual retry for failed orders?
   - **✅ Decided**: Manual retry triggered by user; updates existing order record
5. **Soft Delete**: Should orders be soft-deleted or hard-deleted?
   - **Recommendation**: Soft delete with `deletedAt` timestamp for audit purposes
6. **Audit Trail**: Track all changes to order status?
   - **Recommendation**: Yes, add `statusHistory` array field with timestamps and actors
7. **Provider Selection**: How does user select provider during creation?
   - **✅ Decided**: Provider is selected via quote selection; quote contains provider info
8. **Cost Calculation**: Store in DB or calculate on-demand?
   - **✅ Decided**: Store cost from quote `total` field in order record
9. **Tracking Number Generation**: Format for internal Kraft tracking numbers?
   - **✅ DECIDED**: Sequential format `KFT-{YEAR}{MONTH}-{SEQUENCE}`
   - Six-digit sequence resets monthly
   - User-friendly and professional appearance
   - Easy to communicate with customer support
10. **Duplicate Prevention**: Additional safeguards beyond FE button disable?
    - **Need Decision**: Idempotency keys? Check for recent duplicate orders?
11. **Error Message Display**: Show provider error or friendly message?
    - **Need Client Decision**: See Questions for Client section
12. **Admin Audit Log**: Log all admin actions on orders?
    - **Recommendation**: Yes, track who cancelled/updated orders

---

## Questions for Client

The following questions need client input before finalizing implementation:

### 1. Order Cancellation

**Question**: Can users cancel orders after creation? If yes:

- At what point can orders no longer be cancelled?
- Do we need to call the external provider's cancel API?
- What happens to the order in our system (status change to 'cancelled')?
- Should cancellation be free or are there fees?

**Impact**: Affects API design, provider integration, and status workflow.

### 2. Failed Order Retry Behavior

**Question**: When an order creation fails at the external provider:

- Should users be able to retry unlimited times?
- Should there be a time limit for retries?
- Should we charge/track each retry attempt?
- Should we suggest alternative providers if one consistently fails?

**Impact**: Affects UX, business logic, and cost tracking.

### 3. Order Editing Capability

**Question**: Can users edit order details after creation?

- Before provider confirmation?
- After provider confirmation?
- What fields can be edited (address, package details, etc.)?
- Does editing require provider API update or just our DB?

**Impact**: Significant impact on data model and provider integration complexity.

### 4. Error Message Display

**Question**: When order creation fails:

- Show technical error from provider to user?
- Show user-friendly generic message?
- Show different messages for different error types?
- Provide troubleshooting suggestions?

**Impact**: Affects UX and error handling strategy.

### 5. Admin Order Creation

**Question**: Can admins create orders on behalf of users?

- If yes, how do they specify which user?
- Are there special permissions or audit requirements?
- Can admins modify order details that users cannot?

**Impact**: Affects admin API endpoints and authorization logic.

### 6. Admin Actions and Permissions

**Question**: What other admin capabilities are needed?

- Add notes/comments to orders?
- Issue refunds?
- Override order status manually?
- Delete orders permanently?
- View sensitive customer data (payment info)?

**Impact**: Affects admin API design and permission system.

### 7. Notification Preferences

**Question**: What notifications should users receive (future feature)?

- Email, SMS, push notifications, or combination?
- Which events trigger notifications (created, shipped, delivered, failed)?
- Can users customize notification preferences?
- Should admins receive notifications for failed orders?

**Impact**: Affects future notification system design.

### 8. Order History and Retention

**Question**: How long should order data be retained?

- Keep all orders indefinitely?
- Archive old orders after X days/months?
- Different retention for different statuses (e.g., delivered vs failed)?
- Compliance or legal requirements?

**Impact**: Affects database design, storage costs, and archival strategy.

### 9. Refund and Dispute Process

**Question**: How are refunds and disputes handled?

- Track refund status in order record?
- Allow users to request refunds through the system?
- Admin approval required?
- Integration with payment system?

**Impact**: Affects order schema and potential new module requirements.

### 10. Multi-Package Orders

**Question**: Future consideration - will orders ever contain multiple packages?

- If yes, when is this feature needed?
- How would pricing work?
- Same destination or different destinations?

**Impact**: May affect initial schema design if coming soon.

---

## Technical Decisions Made (Summary)

### ✅ Confirmed Decisions

1. **Order Creation Flow**: External API first → Save to DB (always, regardless of result)
2. **Tracking Numbers**: Dual system with three properties:
   - `kraftId`: Custom Kraft tracking (KFT-202605-XXXXXX) - always present
   - `externalId`: Provider tracking number - populated on successful provider response
   - `isProviderTrackingSynced`: Boolean flag for sync status
3. **ID Strategy**: MongoDB ObjectId for DB operations, kraftId for customer-facing
4. **Cost Source**: Quote `total` field
5. **Address Storage**: Full address data embedded in order
6. **User Isolation**: Strict - users see only their orders
7. **Admin Visibility**: Admins see all orders
8. **Retry Strategy**: Manual retry, updates existing order
9. **Concurrent Orders**: Allowed - no locking
10. **Sync Strategy**: On-demand when viewing order detail
11. **Quote Storage**: Not stored in DB
12. **Provider Credentials**: System-wide (not per-user)
13. **Historical Data**: No backfill - start fresh
14. **Payment Integration**: Optional payment reference field for future
15. **Notifications**: Not implemented in MVP
16. **Admin Bulk Operations**: Not in MVP

### ⏳ Pending Client Decisions

1. Order cancellation workflow
2. Failed order retry limits
3. Order editing capability
4. Error message display strategy
5. Admin order creation on behalf of users
6. Additional admin capabilities
7. Notification preferences
8. Order retention policy
9. Refund and dispute process
10. Multi-package orders timeline

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

- **Database is source of truth** for order data
- **External APIs serve as execution mechanisms** for guide creation
- **Users have full visibility** of their order history with strict isolation
- **Admins have comprehensive oversight** of all orders with enhanced permissions
- **System is resilient** to external API failures (stores failed orders for retry)
- **Data is structured** for future analytics and reporting
- **Dual tracking system** (internal Kraft + external provider) ensures no order is lost
- **On-demand synchronization** keeps data fresh without excessive API calls
- **Quote integration** provides accurate cost tracking from user selection
- **Full address embedding** maintains historical accuracy and compliance

### Key Implementation Principles

1. **API-First Creation**: Call provider API before DB persistence
2. **Always Persist**: Save orders regardless of API success/failure
3. **User Isolation**: Strict data access control per user
4. **Transparent Retry**: Failed orders can be retried using stored data
5. **On-Demand Sync**: Fetch latest status when user views order details
6. **Audit Trail**: Track status changes, cancellations, and admin actions
7. **Provider Agnostic**: Design supports all four providers (GE, T1, Pakke, Manuable)

### Pending Client Decisions

Before full implementation, the following must be confirmed with the client:

- Order cancellation workflow and provider integration
- Failed order retry limits and policies
- Order editing capabilities and restrictions
- Error message display strategy (technical vs user-friendly)
- Admin order creation on behalf of users
- Additional admin capabilities and audit requirements
- Order retention and archival policies
- Refund and dispute handling processes

The research provides a comprehensive foundation for implementation. Next step is to create a detailed technical plan with specific tasks, database schemas, and API contracts.
