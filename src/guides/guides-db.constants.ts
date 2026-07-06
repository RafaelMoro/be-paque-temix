/** Used when user email is missing from request or not found in database */
export const GDE_AUTH_001 = 'GDE-AUTH-001';

/** Used when a guide cannot be found by kraftId or ObjectId */
export const GDE_NF_001 = 'GDE-NF-001';
/** Used when syncing a guide that has no external tracking ID */
export const GDE_NF_002 = 'GDE-NF-002';

/** Used when retry eligibility check fails (max attempts or cooldown active) */
export const GDE_RTL_001 = 'GDE-RTL-001';

/** Used for general database errors during guide creation */
export const GDE_BDN_001 = 'GDE-BDN-001';
/** Used when kraftId counter update/creation fails */
export const GDE_BDN_008 = 'GDE-BDN-008';
/** Used when a generic/unknown backend error occurs */
export const GDE_BDN_009 = 'GDE-BDN-009';
/** Used when soft delete of a guide fails */
export const GDE_BDN_010 = 'GDE-BDN-010';
/** Used when hard delete of a guide fails */
export const GDE_BDN_011 = 'GDE-BDN-011';
/** Used when updating guide data fails */
export const GDE_BDN_012 = 'GDE-BDN-012';

/** Default provider error when no specific mapping exists */
export const GDE_PVR_001 = 'GDE-PVR-001';
/** Used when provider returns empty or invalid guide response */
export const GDE_PVR_002 = 'GDE-PVR-002';
/** Used when provider returns 401 unauthorized */
export const GDE_PVR_003 = 'GDE-PVR-003';
/** Used when provider returns 5xx server error */
export const GDE_PVR_004 = 'GDE-PVR-004';
/** Used when provider returns validation/fields error (400) */
export const GDE_PVR_005 = 'GDE-PVR-005';
/** Used when provider indicates the quote ID has expired */
export const GDE_PVR_006 = 'GDE-PVR-006';

/** Used for DNS/network errors (ENOTFOUND) */
export const GDE_NET_001 = 'GDE-NET-001';
/** Used for connection timeout errors (ETIMEDOUT) */
export const GDE_TMOT_001 = 'GDE-TMOT-001';
/** Used when provider returns rate limit error */
export const GDE_RLIM_003 = 'GDE-RLIM-003';
/** Used when invalid provider is specified */
export const GDE_BUS_007 = 'GDE-BUS-007';

export const RETRY_MAX_ATTEMPTS = 10;
export const RETRY_COOLDOWN_MS = 5 * 60 * 1000;

export const MSG_USER_NOT_AUTHENTICATED = 'User not authenticated';
export const MSG_USER_NOT_FOUND = 'User not found';
export const MSG_GUIDE_NOT_FOUND = 'Guide not found';
export const MSG_NOT_ELIGIBLE_RETRY = 'Not eligible for retry';
export const MSG_PROVIDER_ERROR = 'Provider error';
export const MSG_RETRY_FAILED = 'Retry failed';
export const MSG_NO_EXTERNAL_TRACKING_ID =
  'Guide has no external tracking ID to sync';
export const MSG_FAILED_CREATE_GUIDE = 'Failed to create guide';
export const MSG_FAILED_GENERATE_KRAFT_ID = 'Failed to generate kraftId';
export const MSG_FAILED_SOFT_DELETE = 'Failed to soft delete guide';
export const MSG_FAILED_HARD_DELETE = 'Failed to hard delete guide';
export const MSG_PROVIDER_RETURNED_EMPTY = 'Provider returned empty guide';
export const MSG_INVALID_PROVIDER = 'Invalid provider specified';
export const MSG_PROVIDER_VALIDATION_ERROR =
  'Provider validation error - check response for details';
export const MSG_QUOTE_EXPIRED =
  'Quote has expired, please create a new quote before updating the guide';
export const MSG_FAILED_UPDATE_GUIDE = 'Failed to update guide data';
