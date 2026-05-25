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

### 1. Order Creation Flow

**Requirement**: Create order via external API first, then persist to DB regardless of success/failure.

**High-Level Actions**:

- Create `Order` entity/schema with Mongoose
- Define order status lifecycle (created, failed, in-transit, delivered, cancelled, etc.)
- Implement API-first creation logic:
  1. Call external provider API with quote data
  2. Save to DB regardless of API result
  3. Store appropriate status based on API response
- Handle success/failure scenarios from external APIs
- Generate internal Kraft tracking number if provider fails to provide one
- Replace internal tracking number when provider returns one (provider tracking is source of truth)
- Support retry for failed orders by updating existing order record

### 2. User Order Retrieval

**Requirement**: Get orders by user.

**High-Level Actions**:

- Create endpoint to fetch orders filtered by user ID (from JWT token)
- Implement pagination for order lists
- Add sorting capabilities (by date, status, provider)
- **Priority filters**: Search by tracking number (internal or external), provider, date range, status
- Search functionality must check both internal Kraft tracking number AND external provider tracking number
- Users can only access their own orders (strict isolation)
- Return formatted order data with provider-specific details

### 3. Admin Access

**Requirement**: Admin users can see all orders from all users including their own.

**High-Level Actions**:

- Implement role-based query logic (admin vs user)
- Create admin-specific endpoint or extend user endpoint with role check
- Return all orders when user role is 'admin'
- Return user-specific orders when role is 'user'
- Maintain proper authorization guards

**Admin Capabilities** (confirmed for MVP):

- View all orders from all users
- Cancel any order
- Manually update order status
- Same search/filter capabilities as users but across all orders
- Fetch orders by month and year (defaults to current month if not specified)

**Admin Features to Discuss with Client**:

- Add notes/comments to orders
- Bulk operations (export, status updates)
- Refund management
- Dispute resolution
- Audit log access

---

## Database Design Considerations

### Order Entity Structure

**Core Fields**:

- User reference (relationship to User entity)
- Provider identifier (guia-envia, t1, pakke, manuable)
- Order status (created, failed, in-transit, delivered, cancelled, etc.)
- Kraft internal tracking number (generated if provider fails)
- External provider tracking number (source of truth when available)
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
- `generateInternalTrackingNumber()` - Generate Kraft tracking number
- `searchByTrackingNumber(trackingNumber, userId, isAdmin)` - Search both internal and external tracking

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

### Purpose

Implement standardized error codes for backend developers to quickly identify and debug issues while keeping error messages user-friendly. Error codes are included in API responses for logging and support purposes but not displayed to end users.

### Recommended Format: **Module-ErrorType-Code**

**Structure**: `XXX-YYY-###`

- **Module (XXX)**: 3-letter abbreviation of the module
- **ErrorType (YYY)**: 3-letter error category
- **Code (###)**: 3-digit sequential number (001-999)

**Example**: `CMD-DB-001`, `DVS-EXT-042`, `AUT-VAL-015`

### Alternative Format Options

#### Option 1: Module-ErrorType-Code (Recommended ✓)

**Example**: `CMD-DB-001`, `DVS-VAL-002`

- **Pros**: Balanced length, clear hierarchy, easy to filter by module or type
- **Cons**: None significant
- **Best for**: Most use cases

#### Option 2: Module-Operation-ErrorType-Code

**Example**: `CMD-CRE-DB-01`, `CMD-GET-VAL-02`

- **Pros**: Very specific, shows exact operation
- **Cons**: Verbose, harder to read
- **Best for**: Complex systems with many operations per module

#### Option 3: ErrorType-Module-Code

**Example**: `DB-CMD-001`, `VAL-DVS-002`

- **Pros**: Groups by error type first, good for monitoring
- **Cons**: Less intuitive when debugging specific modules
- **Best for**: Error-focused monitoring systems

### Module Abbreviations

**Note**: Module codes use French-based abbreviations to make error codes less obvious to external parties while remaining meaningful to the development team.

| Module         | Code | French Origin        | Description                             |
| -------------- | ---- | -------------------- | --------------------------------------- |
| Orders         | CMD  | Commandes            | Order management and creation           |
| Quotes         | DVS  | Devis                | Quote requests and calculations         |
| Guides         | GID  | Guides               | Guide retrieval and management (legacy) |
| Addresses      | ADS  | Adresses             | Address management                      |
| Authentication | AUT  | Authentification     | Login, tokens, sessions                 |
| Users          | UTL  | Utilisateurs         | User management                         |
| GuiaEnvia      | GEV  | GuiaEnvia (variant)  | GuiaEnvia provider integration          |
| T1             | T1E  | T1 (extended)        | T1 provider integration                 |
| Pakke          | PKE  | Pakke (abbreviated)  | Pakke provider integration              |
| Manuable       | MBL  | Manuable (shortened) | Manuable provider integration           |
| Global Configs | CFG  | Configurations       | Configuration management                |
| Token Manager  | GJT  | Gestionnaire Jetons  | Token management                        |
| Mail           | CRR  | Courrier             | Email services                          |

### Error Type Categories

| Error Type     | Code  | Description                  | When to Use                                                   |
| -------------- | ----- | ---------------------------- | ------------------------------------------------------------- |
| Database       | DB    | Database operations failed   | Mongoose errors, connection issues, query failures            |
| Validation     | VAL   | Input validation failed      | DTO validation, schema validation, business rule validation   |
| External API   | EXT   | External provider API failed | Provider API errors, timeouts, invalid responses              |
| Authorization  | AUTH  | Permission denied            | Role check failed, JWT invalid, access denied                 |
| Authentication | AUTHN | Identity verification failed | Login failed, invalid credentials, expired session            |
| Business Logic | BUS   | Business rule violation      | Order can't be cancelled, insufficient balance, invalid state |
| Not Found      | NF    | Resource not found           | Order not found, user not found, address not found            |
| Conflict       | CONF  | Resource conflict            | Duplicate order, concurrent modification                      |
| Network        | NET   | Network/connection error     | Timeout, connection refused, DNS failure                      |
| Configuration  | CFG   | System configuration error   | Missing env vars, invalid config, service unavailable         |
| Internal       | INT   | Unexpected internal error    | Unhandled exceptions, system errors                           |

### Error Code Registry

#### Orders Module (CMD-XXX-###)

**Database Errors (CMD-DB-###)**

- `CMD-DB-001`: Failed to save order to database
- `CMD-DB-002`: Failed to update order status
- `CMD-DB-003`: Failed to retrieve order from database
- `CMD-DB-004`: Failed to delete order
- `CMD-DB-005`: Database connection timeout
- `CMD-DB-006`: Failed to save order history/audit trail

**Validation Errors (CMD-VAL-###)**

- `CMD-VAL-001`: Invalid order creation payload
- `CMD-VAL-002`: Missing required field in order data
- `CMD-VAL-003`: Invalid provider specified
- `CMD-VAL-004`: Invalid quote ID
- `CMD-VAL-005`: Invalid address format
- `CMD-VAL-006`: Invalid package dimensions
- `CMD-VAL-007`: Invalid tracking number format

**External API Errors (CMD-EXT-###)**

- `CMD-EXT-001`: Provider API call failed
- `CMD-EXT-002`: Provider API timeout
- `CMD-EXT-003`: Provider returned invalid response
- `CMD-EXT-004`: Provider authentication failed
- `CMD-EXT-005`: Provider rate limit exceeded
- `CMD-EXT-006`: Provider service unavailable
- `CMD-EXT-007`: Failed to fetch tracking update from provider

**Authorization Errors (CMD-AUTH-###)**

- `CMD-AUTH-001`: User not authorized to view order
- `CMD-AUTH-002`: User not authorized to cancel order
- `CMD-AUTH-003`: Admin role required
- `CMD-AUTH-004`: User not authorized to update order status

**Not Found Errors (CMD-NF-###)**

- `CMD-NF-001`: Order not found by ID
- `CMD-NF-002`: Order not found by tracking number
- `CMD-NF-003`: No orders found for user

**Business Logic Errors (CMD-BUS-###)**

- `CMD-BUS-001`: Order cannot be cancelled (wrong status)
- `CMD-BUS-002`: Order already delivered
- `CMD-BUS-003`: Retry limit exceeded
- `CMD-BUS-004`: Order creation failed, max retries reached
- `CMD-BUS-005`: Cannot update order status (invalid transition)
- `CMD-BUS-006`: Concurrent order creation limit exceeded

**Internal Errors (CMD-INT-###)**

- `CMD-INT-001`: Failed to generate internal tracking number
- `CMD-INT-002`: Unexpected error during order creation
- `CMD-INT-003`: Failed to sync order with provider

#### Quotes Module (DVS-XXX-###)

**External API Errors (DVS-EXT-###)**

- `DVS-EXT-001`: Failed to fetch quotes from provider
- `DVS-EXT-002`: Provider quote API timeout
- `DVS-EXT-003`: No quotes available from providers
- `DVS-EXT-004`: All providers failed to return quotes

**Validation Errors (DVS-VAL-###)**

- `DVS-VAL-001`: Invalid quote request payload
- `DVS-VAL-002`: Invalid package dimensions for quote
- `DVS-VAL-003`: Invalid postal codes
- `DVS-VAL-004`: Quote ID not found or expired

**Business Logic Errors (DVS-BUS-###)**

- `DVS-BUS-001`: No quotes available for given criteria
- `DVS-BUS-002`: Quote price calculation error

#### Authentication Module (AUT-XXX-###)

**Authentication Errors (AUT-AUTHN-###)**

- `AUT-AUTHN-001`: Invalid credentials
- `AUT-AUTHN-002`: User account locked
- `AUT-AUTHN-003`: JWT token expired
- `AUT-AUTHN-004`: JWT token invalid
- `AUT-AUTHN-005`: Refresh token expired
- `AUT-AUTHN-006`: Session expired

**Authorization Errors (AUT-AUTH-###)**

- `AUT-AUTH-001`: Insufficient permissions
- `AUT-AUTH-002`: Admin role required
- `AUT-AUTH-003`: Resource access denied

**Validation Errors (AUT-VAL-###)**

- `AUT-VAL-001`: Invalid email format
- `AUT-VAL-002`: Password requirements not met
- `AUT-VAL-003`: Missing authentication header

#### Addresses Module (ADS-XXX-###)

**Database Errors (ADS-DB-###)**

- `ADS-DB-001`: Failed to save address
- `ADS-DB-002`: Failed to update address
- `ADS-DB-003`: Failed to delete address

**Validation Errors (ADS-VAL-###)**

- `ADS-VAL-001`: Invalid address format
- `ADS-VAL-002`: Invalid postal code
- `ADS-VAL-003`: Missing required address fields

**Not Found Errors (ADS-NF-###)**

- `ADS-NF-001`: Address not found

#### Users Module (UTL-XXX-###)

**Database Errors (UTL-DB-###)**

- `UTL-DB-001`: Failed to create user
- `UTL-DB-002`: Failed to update user
- `UTL-DB-003`: Failed to delete user

**Validation Errors (UTL-VAL-###)**

- `UTL-VAL-001`: Invalid user data
- `UTL-VAL-002`: Email already exists
- `UTL-VAL-003`: Invalid phone number format

**Not Found Errors (UTL-NF-###)**

- `UTL-NF-001`: User not found

#### Provider Modules (GEV-XXX-###, T1E-XXX-###, PKE-XXX-###, MBL-XXX-###)

**External API Errors**

- `GEV-EXT-001`: GuiaEnvia API authentication failed
- `GEV-EXT-002`: GuiaEnvia API request failed
- `T1E-EXT-001`: T1 API authentication failed
- `T1E-EXT-002`: T1 API request failed
- `PKE-EXT-001`: Pakke API authentication failed
- `PKE-EXT-002`: Pakke API request failed
- `MBL-EXT-001`: Manuable API authentication failed
- `MBL-EXT-002`: Manuable API request failed

### Implementation Guidelines

#### 1. Error Response Structure

```typescript
{
  "success": false,
  "errorCode": "CMD-DB-001",
  "message": "Unable to process your order at this time. Please try again.",
  "technicalMessage": "Failed to save order to database: Connection timeout", // Dev/logs only
  "timestamp": "2026-05-25T10:30:00Z",
  "requestId": "req-uuid-12345",
  "data": null
}
```

#### 2. Error Class Implementation

```typescript
export class KraftError extends Error {
  constructor(
    public errorCode: string,
    public message: string,
    public technicalMessage?: string,
    public httpStatusCode: number = 500,
    public details?: any,
  ) {
    super(message);
    this.name = 'KraftError';
  }
}
```

#### 3. Usage in Code

```typescript
// Example: Order creation failure
throw new KraftError(
  'CMD-DB-001',
  'Unable to process your order at this time. Please try again.',
  `Failed to save order to database: ${error.message}`,
  500,
  { userId, provider },
);

// Example: Validation error
throw new KraftError(
  'CMD-VAL-003',
  'Invalid shipping provider selected.',
  `Provider '${provider}' is not supported`,
  400,
);
```

#### 4. Exception Filter

Create a global exception filter to catch KraftError and format responses:

```typescript
@Catch(KraftError)
export class KraftErrorFilter implements ExceptionFilter {
  catch(exception: KraftError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Log technical message for developers
    this.logger.error({
      errorCode: exception.errorCode,
      technicalMessage: exception.technicalMessage,
      requestId: request.id,
      path: request.url,
      method: request.method,
    });

    // Return user-friendly response
    response.status(exception.httpStatusCode).json({
      success: false,
      errorCode: exception.errorCode,
      message: exception.message,
      timestamp: new Date().toISOString(),
      requestId: request.id,
    });
  }
}
```

#### 5. Logging and Monitoring

- Log all errors with error codes to centralized logging system
- Create dashboards to monitor error frequency by code
- Set up alerts for critical errors (DB, EXT)
- Include error codes in support tickets for faster resolution

#### 6. Documentation

**In README.md**, include:

- Link to complete error code registry
- How to interpret error codes
- Common errors and solutions
- How to report issues with error codes

**Example README section**:

```markdown
## Error Codes

All API responses include a standardized error code for debugging:

Format: `MODULE-TYPE-CODE`

- MODULE: Which part of the system (CMD=Orders, DVS=Quotes, etc.)
- TYPE: Error category (DB=Database, VAL=Validation, EXT=External API, etc.)
- CODE: Specific error number

Example: `CMD-DB-001` = Orders module, Database error, code 001

See [Error Code Registry](./docs/ERROR_CODES.md) for complete list.
```

### Error Code Maintenance

1. **Adding New Error Codes**:
   - Document in error code registry before implementation
   - Follow sequential numbering within category
   - Include description and when to use

2. **Deprecating Error Codes**:
   - Mark as deprecated but don't reuse codes
   - Maintain for at least 6 months
   - Document replacement code

3. **Code Review**:
   - Ensure new errors use appropriate codes
   - Check for duplicate scenarios
   - Verify user messages are friendly

### Benefits of This System

✅ **For Developers**:

- Quick identification of error source and type
- Easy filtering in logs and monitoring
- Consistent error handling across codebase
- Clear troubleshooting path
- French-based codes familiar to team but obscure to outsiders

✅ **For Support**:

- Users can provide error code for faster support
- Support can quickly identify issue type
- Reduced back-and-forth with customers

✅ **For Operations**:

- Easy monitoring and alerting by error type
- Track error trends over time
- Identify problematic modules or integrations

✅ **For Users**:

- Friendly error messages
- Clear path to resolution
- Professional error handling

✅ **For Security**:

- Error codes not immediately obvious to external parties
- French-based abbreviations add layer of obscurity
- Prevents easy reverse-engineering of system architecture
- Codes remain meaningful only to authorized team members

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
- **Index on internal tracking number** for search functionality
- **Index on external tracking number** for search functionality
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
   - **Recommendation**: Use MongoDB ObjectId for simplicity
2. **Status Enum**: Comprehensive list of all possible statuses?
   - **Defined**: See Status Management section (created, failed, waiting, in-transit, on-delivery, delivered, cancelled, returned, exception)
   - **Action**: Map provider statuses to Kraft statuses during implementation
3. **Provider Data Storage**: Embed vs reference external provider data?
   - **Decided**: Embed full provider response for audit and historical accuracy
4. **Retry Logic**: Automatic vs manual retry for failed orders?
   - **Decided**: Manual retry triggered by user; updates existing order record
5. **Soft Delete**: Should orders be soft-deleted or hard-deleted?
   - **Recommendation**: Soft delete with `deletedAt` timestamp for audit purposes
6. **Audit Trail**: Track all changes to order status?
   - **Recommendation**: Yes, add `statusHistory` array field with timestamps and actors
7. **Provider Selection**: How does user select provider during creation?
   - **Decided**: Provider is selected via quote selection; quote contains provider info
8. **Cost Calculation**: Store in DB or calculate on-demand?
   - **Decided**: Store cost from quote `total` field in order record
9. **Tracking Number Generation**: Format for internal Kraft tracking numbers?
   - **Need Decision**: Prefix + timestamp + random? Sequential? UUID?
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
2. **Tracking Numbers**: Dual system (internal Kraft + external provider)
3. **Cost Source**: Quote `total` field
4. **Address Storage**: Full address data embedded in order
5. **User Isolation**: Strict - users see only their orders
6. **Admin Visibility**: Admins see all orders
7. **Retry Strategy**: Manual retry, updates existing order
8. **Concurrent Orders**: Allowed - no locking
9. **Sync Strategy**: On-demand when viewing order detail
10. **Quote Storage**: Not stored in DB
11. **Provider Credentials**: System-wide (not per-user)
12. **Historical Data**: No backfill - start fresh
13. **Payment Integration**: Optional payment reference field for future
14. **Notifications**: Not implemented in MVP
15. **Admin Bulk Operations**: Not in MVP

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
