# Kraft API Error Code System

## Overview

This document defines the standardized error code system for the Kraft backend API. The error code system provides a structured approach to error identification and debugging while maintaining user-friendly error messages for end users.

## Purpose

Implement standardized error codes for backend developers to quickly identify and debug issues while keeping error messages user-friendly. Error codes are included in API responses for logging and support purposes but not displayed to end users.

## Recommended Format: **Module-ErrorType-Code**

**Structure**: `XXX-YYY-###`

- **Module (XXX)**: 3-letter abbreviation of the module
- **ErrorType (YYY)**: 3-letter error category
- **Code (###)**: 3-digit sequential number (001-999)

**Example**: `CMD-DB-001`, `DVS-EXT-042`, `AUT-VAL-015`

## Alternative Format Options

### Option 1: Module-ErrorType-Code (Recommended ✓)

**Example**: `CMD-DB-001`, `DVS-VAL-002`

- **Pros**: Balanced length, clear hierarchy, easy to filter by module or type
- **Cons**: None significant
- **Best for**: Most use cases

### Option 2: Module-Operation-ErrorType-Code

**Example**: `CMD-CRE-DB-01`, `CMD-GET-VAL-02`

- **Pros**: Very specific, shows exact operation
- **Cons**: Verbose, harder to read
- **Best for**: Complex systems with many operations per module

### Option 3: ErrorType-Module-Code

**Example**: `DB-CMD-001`, `VAL-DVS-002`

- **Pros**: Groups by error type first, good for monitoring
- **Cons**: Less intuitive when debugging specific modules
- **Best for**: Error-focused monitoring systems

## Module Abbreviations

**Note**: Module codes use French-based abbreviations to make error codes less obvious to external parties while remaining meaningful to the development team.

| Module         | Code | French Origin        | Description                             |
| -------------- | ---- | -------------------- | --------------------------------------- |
| Orders         | CMD  | Commandes            | Order management and creation           |
| Quotes         | DVS  | Devis                | Quote requests and calculations         |
| Guides         | GDE  | Guides               | Guide database persistence and tracking |
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

## Error Type Categories

| Error Type     | Code  | Description                  | When to Use                                                   |
| -------------- | ----- | ---------------------------- | ------------------------------------------------------------- |
| Database       | DB    | Database operations failed   | Mongoose errors, connection issues, query failures            |
| Base de Datos  | BDN   | MongoDB operations failed    | Alternative DB error code (used in Guides module)             |
| Validation     | VAL   | Input validation failed      | DTO validation, schema validation, business rule validation   |
| External API   | EXT   | External provider API failed | Provider API errors, timeouts, invalid responses              |
| Provider       | PVR   | Provider API failed          | Provider-specific errors (used in Guides module)              |
| Authorization  | AUTH  | Permission denied            | Role check failed, JWT invalid, access denied                 |
| Authentication | AUTHN | Identity verification failed | Login failed, invalid credentials, expired session            |
| Business Logic | BUS   | Business rule violation      | Order can't be cancelled, insufficient balance, invalid state |
| Not Found      | NF    | Resource not found           | Order not found, user not found, address not found            |
| Conflict       | CONF  | Resource conflict            | Duplicate order, concurrent modification                      |
| Network        | NET   | Network/connection error     | Timeout, connection refused, DNS failure                      |
| Timeout        | TMOT  | Request timeout              | Provider took too long to respond (used in Guides module)     |
| Rate Limit     | RLIM  | Rate limit exceeded          | Too many retry attempts (used in Guides module)               |
| Configuration  | CFG   | System configuration error   | Missing env vars, invalid config, service unavailable         |
| Internal       | INT   | Unexpected internal error    | Unhandled exceptions, system errors                           |

## Error Code Registry

### Orders Module (CMD-XXX-###)

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

### Quotes Module (DVS-XXX-###)

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

### Guides Module (GDE-XXX-###)

**Provider API Errors (GDE-PVR-###)**

- `GDE-PVR-001`: Provider API call failed during guide creation
- `GDE-PVR-002`: Provider returned invalid response format
- `GDE-PVR-003`: Provider authentication failed
- `GDE-PVR-004`: Provider service unavailable
- `GDE-PVR-005`: Provider returned business logic error
- `GDE-PVR-006`: Failed to sync guide status with provider
- `GDE-PVR-007`: Provider rejected guide creation request

**Network Errors (GDE-NET-###)**

- `GDE-NET-001`: Network connection error during provider call
- `GDE-NET-002`: DNS resolution failed for provider API
- `GDE-NET-003`: Connection refused by provider
- `GDE-NET-004`: Network timeout during provider call
- `GDE-NET-005`: SSL/TLS handshake failed

**Timeout Errors (GDE-TMOT-###)**

- `GDE-TMOT-001`: Provider API request timed out
- `GDE-TMOT-002`: Guide creation exceeded maximum wait time
- `GDE-TMOT-003`: Guide status sync timed out

**Rate Limit Errors (GDE-RLIM-###)**

- `GDE-RLIM-001`: Maximum retry attempts exceeded (10 attempts)
- `GDE-RLIM-002`: Retry cooldown period active (5 minutes)
- `GDE-RLIM-003`: Provider rate limit exceeded
- `GDE-RLIM-004`: User exceeded concurrent guide creation limit

**Database Errors (GDE-BDN-###)**

- `GDE-BDN-001`: Failed to save guide to database
- `GDE-BDN-002`: Failed to update guide status in database
- `GDE-BDN-003`: Failed to retrieve guide from database
- `GDE-BDN-004`: Failed to delete guide from database
- `GDE-BDN-005`: Database connection timeout
- `GDE-BDN-006`: Failed to save retry attempt record
- `GDE-BDN-007`: Failed to add comment to guide
- `GDE-BDN-008`: KraftId generation failed

**Authorization Errors (GDE-AUTH-###)**

- `GDE-AUTH-001`: User not authorized to view guide
- `GDE-AUTH-002`: User not authorized to retry guide
- `GDE-AUTH-003`: Admin role required for this action
- `GDE-AUTH-004`: User not authorized to delete guide
- `GDE-AUTH-005`: User not authorized to update guide status
- `GDE-AUTH-006`: User not authorized to add comments

**Not Found Errors (GDE-NF-###)**

- `GDE-NF-001`: Guide not found by ID
- `GDE-NF-002`: Guide not found by kraftId
- `GDE-NF-003`: Guide not found by externalId
- `GDE-NF-004`: No guides found for user
- `GDE-NF-005`: Quote not found for guide creation

**Business Logic Errors (GDE-BUS-###)**

- `GDE-BUS-001`: Cannot retry guide in current status
- `GDE-BUS-002`: Guide already delivered, cannot modify
- `GDE-BUS-003`: Cannot delete guide in current status
- `GDE-BUS-004`: Invalid status transition
- `GDE-BUS-005`: Guide creation failed, cannot proceed
- `GDE-BUS-006`: Cannot add comment to soft-deleted guide
- `GDE-BUS-007`: Invalid provider specified in payload

**Validation Errors (GDE-VAL-###)**

- `GDE-VAL-001`: Invalid guide creation payload
- `GDE-VAL-002`: Missing required field in guide data
- `GDE-VAL-003`: Invalid address format in payload
- `GDE-VAL-004`: Invalid package dimensions
- `GDE-VAL-005`: Invalid tracking number format
- `GDE-VAL-006`: Invalid month/year for admin query

### Authentication Module (AUT-XXX-###)

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

### Addresses Module (ADS-XXX-###)

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

### Users Module (UTL-XXX-###)

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

### Provider Modules (GEV-XXX-###, T1E-XXX-###, PKE-XXX-###, MBL-XXX-###)

**External API Errors**

- `GEV-EXT-001`: GuiaEnvia API authentication failed
- `GEV-EXT-002`: GuiaEnvia API request failed
- `T1E-EXT-001`: T1 API authentication failed
- `T1E-EXT-002`: T1 API request failed
- `PKE-EXT-001`: Pakke API authentication failed
- `PKE-EXT-002`: Pakke API request failed
- `MBL-EXT-001`: Manuable API authentication failed
- `MBL-EXT-002`: Manuable API request failed

## Implementation Guidelines

### 1. Error Response Structure

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

### 2. Error Class Implementation

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

### 3. Usage in Code

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

### 4. Exception Filter

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

### 5. Logging and Monitoring

- Log all errors with error codes to centralized logging system
- Create dashboards to monitor error frequency by code
- Set up alerts for critical errors (DB, EXT)
- Include error codes in support tickets for faster resolution

### 6. Documentation

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

## Error Code Maintenance

### Adding New Error Codes

1. Document in error code registry before implementation
2. Follow sequential numbering within category
3. Include description and when to use
4. Update this research document with new codes

### Deprecating Error Codes

1. Mark as deprecated but don't reuse codes
2. Maintain for at least 6 months
3. Document replacement code
4. Update implementation to use new codes

### Code Review Checklist

- ✓ Ensure new errors use appropriate codes
- ✓ Check for duplicate scenarios
- ✓ Verify user messages are friendly
- ✓ Confirm technical messages are informative
- ✓ Test error responses match expected format

## Benefits of This System

### For Developers

- Quick identification of error source and type
- Easy filtering in logs and monitoring
- Consistent error handling across codebase
- Clear troubleshooting path
- French-based codes familiar to team but obscure to outsiders

### For Support

- Users can provide error code for faster support
- Support can quickly identify issue type
- Reduced back-and-forth with customers
- Clear escalation path for technical issues

### For Operations

- Easy monitoring and alerting by error type
- Track error trends over time
- Identify problematic modules or integrations
- Measure error reduction progress

### For Users

- Friendly error messages
- Clear path to resolution
- Professional error handling
- Consistent experience

### For Security

- Error codes not immediately obvious to external parties
- French-based abbreviations add layer of obscurity
- Prevents easy reverse-engineering of system architecture
- Codes remain meaningful only to authorized team members

## Implementation Roadmap

### Phase 1: Core Setup

- [ ] Create `KraftError` class in `src/exceptions/KraftError.ts`
- [ ] Create `KraftErrorFilter` in `src/exceptions/KraftErrorFilter.ts`
- [ ] Register filter globally in main module
- [ ] Create `ERROR_CODES.md` documentation file

### Phase 2: Module Integration

- [ ] Implement error codes in Orders module
- [ ] Implement error codes in Quotes module
- [ ] Implement error codes in Authentication module
- [ ] Implement error codes in Addresses module
- [ ] Implement error codes in Users module
- [ ] Implement error codes in Provider modules

### Phase 3: Testing & Documentation

- [ ] Unit tests for error class and filter
- [ ] Integration tests for error responses
- [ ] Update README with error code documentation
- [ ] Update Swagger/OpenAPI specs with error responses

### Phase 4: Monitoring & Logging

- [ ] Set up error code logging
- [ ] Create monitoring dashboards
- [ ] Configure alerts for critical errors
- [ ] Document troubleshooting procedures

## Related Documentation

- [Order Tracking Database Research](./order-tracking-database-research.md) - Main order tracking implementation plan
- `/src/exceptions/` - Exception handling implementation
- `README.md` - API error code documentation
- `/docs/ERROR_CODES.md` - Complete error code registry (to be created)

---

**Document Version**: 1.0  
**Last Updated**: May 25, 2026  
**Status**: Research Complete - Ready for Implementation
