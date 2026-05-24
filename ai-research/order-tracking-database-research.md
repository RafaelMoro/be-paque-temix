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

**Requirement**: Create guide in DB first, then sync with external API upon successful response.

**High-Level Actions**:

- Create `Order` entity/schema with Mongoose
- Define order status lifecycle (pending, created, failed, cancelled, etc.)
- Implement database-first creation logic
- Update external API creation to sync after DB persistence
- Handle success/failure scenarios from external APIs
- Update DB order status based on external API response

### 2. User Order Retrieval

**Requirement**: Get orders by user.

**High-Level Actions**:

- Create endpoint to fetch orders filtered by user ID
- Implement pagination for order lists
- Add sorting capabilities (by date, status, provider)
- Filter orders by status, provider, date range
- Return formatted order data with provider-specific details

### 3. Admin Access

**Requirement**: Admin users can see all orders from all users including their own.

**High-Level Actions**:

- Implement role-based query logic (admin vs user)
- Create admin-specific endpoint or extend user endpoint with role check
- Return all orders when user role is 'admin'
- Return user-specific orders when role is 'user'
- Maintain proper authorization guards

---

## Database Design Considerations

### Order Entity Structure

**Core Fields**:

- User reference (relationship to User entity)
- Provider identifier (guia-envia, t1, pakke, manuable)
- Order status (pending, processing, created, failed, cancelled)
- External provider response data
- Tracking number(s)
- Creation timestamp
- Last updated timestamp
- Guide document URL
- Shipping details (origin, destination, package info)
- Cost information

### Relationships

- **User ↔ Orders**: One-to-Many
  - User has many orders
  - Order belongs to one user

### Status Management

**Suggested Status Flow**:

1. `pending` - Order created in DB, awaiting external API call
2. `processing` - External API call in progress
3. `created` - Successfully created in external provider
4. `failed` - External API call failed
5. `cancelled` - Order cancelled by user
6. `delivered` - Shipment delivered (synced from provider)
7. `in-transit` - Shipment in transit (synced from provider)

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
  provider: 'guia-envia' | 't1' | 'pakke' | 'manuable',
  shippingDetails: { /* provider-specific payload */ }
}
```

**Flow**:

1. Validate request payload
2. Create order in DB with status 'pending'
3. Call provider-specific create-guide service
4. Update order with external API response
5. Update status to 'created' or 'failed'
6. Return order data

### User Orders Retrieval

**Endpoint**: `GET /orders` or `GET /orders/my-orders`
**Query Parameters**:

- `page` - Pagination
- `limit` - Results per page
- `status` - Filter by status
- `provider` - Filter by provider
- `startDate` - Filter by date range
- `endDate` - Filter by date range

**Authorization**:

- Extracts user ID from JWT token
- Returns orders belonging to authenticated user

### Admin Orders Retrieval

**Endpoint**: `GET /orders/all` or same endpoint with role detection
**Query Parameters**: Same as user orders
**Authorization**:

- Requires 'admin' role
- Returns all orders from all users
- Optional user ID filter for admin queries

### Single Order Detail

**Endpoint**: `GET /orders/:orderId`
**Authorization**:

- User can only view their own orders
- Admin can view any order

---

## Service Layer Architecture

### OrdersService

**Responsibilities**:

- Create orders in database
- Query orders with filters
- Update order status
- Coordinate with provider services
- Handle order lifecycle events

**Key Methods**:

- `createOrder(userId, provider, payload)` - Create order in DB
- `syncWithProvider(orderId)` - Sync with external API
- `getOrdersByUser(userId, filters)` - Get user orders
- `getAllOrders(filters)` - Get all orders (admin)
- `getOrderById(orderId)` - Get single order
- `updateOrderStatus(orderId, status)` - Update status
- `cancelOrder(orderId)` - Cancel order

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

## Data Synchronization Strategy

### Initial Creation

1. **DB First**: Create order in database
2. **API Call**: Call external provider API
3. **Update DB**: Update order with provider response
4. **Handle Failures**: Rollback or mark as failed

### Periodic Sync (Future Enhancement)

- Background job to sync order status
- Update tracking information
- Sync delivery status
- Handle provider-initiated updates (webhooks)

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
- Compound indexes for common query patterns

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
2. **Status Enum**: Comprehensive list of all possible statuses?
3. **Provider Data Storage**: Embed vs reference external provider data?
4. **Retry Logic**: Automatic vs manual retry for failed orders?
5. **Soft Delete**: Should orders be soft-deleted or hard-deleted?
6. **Audit Trail**: Track all changes to order status?
7. **Provider Selection**: How does user select provider during creation?
8. **Cost Calculation**: Store in DB or calculate on-demand?

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
- **Users have full visibility** of their order history
- **Admins have comprehensive oversight** of all orders
- **System is resilient** to external API failures
- **Data is structured** for future analytics and reporting

The transition requires careful coordination between database operations and external API calls, with robust error handling and a clear status lifecycle.
