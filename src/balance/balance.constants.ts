export const BALANCE_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const;

export type BalanceRequestStatus = (typeof BALANCE_REQUEST_STATUSES)[number];

export const ADMIN_BALANCE_REQUEST_FILTERS = ['pending', 'all'] as const;
export type AdminBalanceRequestFilter =
  (typeof ADMIN_BALANCE_REQUEST_FILTERS)[number];

export const BALANCE_REQUEST_MAX_AMOUNT = 100000;
export const MAX_SAFE_MONEY_CENTS = Number.MAX_SAFE_INTEGER;

export const BAL_AUTH_001 = 'BAL-AUTH-001';
export const BAL_NF_001 = 'BAL-NF-001';
export const BAL_AUTH_002 = 'BAL-AUTH-002';
export const BAL_BUS_001 = 'BAL-BUS-001';
export const BAL_BUS_002 = 'BAL-BUS-002';
export const BAL_BUS_003 = 'BAL-BUS-003';
export const BAL_BDN_001 = 'BAL-BDN-001';
export const BAL_BDN_002 = 'BAL-BDN-002';

export const MSG_BALANCE_USER_NOT_AUTHENTICATED =
  'No fue posible identificar al usuario autenticado.';
export const MSG_BALANCE_REQUEST_NOT_FOUND =
  'No se encontro la solicitud de saldo.';
export const MSG_BALANCE_REQUEST_FORBIDDEN =
  'No tienes permiso para modificar esta solicitud de saldo.';
export const MSG_BALANCE_INVALID_STATE =
  'La solicitud de saldo no se encuentra en un estado válido para esta operación.';
export const MSG_BALANCE_INSUFFICIENT_FUNDS = 'Saldo insuficiente.';
export const MSG_BALANCE_INVALID_AMOUNT =
  'El monto debe ser positivo, válido y tener al menos un centavo.';
export const MSG_BALANCE_DATABASE_ERROR =
  'No fue posible procesar la operación de saldo.';
export const MSG_BALANCE_TRANSACTION_ERROR =
  'No fue posible completar la transacción de saldo.';
