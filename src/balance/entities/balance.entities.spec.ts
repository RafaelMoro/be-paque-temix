import { MAX_SAFE_MONEY_CENTS } from '../balance.constants';
import { BalanceSchema } from './balance.entity';
import { BalanceRequestSchema } from './balance-request.entity';

describe('balance schemas', () => {
  it('defines the wallet ownership and amount constraints', () => {
    const email = BalanceSchema.path('userEmail').options;
    const amount = BalanceSchema.path('amountInCents').options;

    expect(email).toMatchObject({ required: true, unique: true, index: true });
    expect(amount).toMatchObject({
      required: true,
      default: 0,
      min: 0,
      max: MAX_SAFE_MONEY_CENTS,
    });
    expect(amount.validate).toBe(Number.isSafeInteger);
  });

  it('defines immutable requests with the required owner snapshot', () => {
    const amount = BalanceRequestSchema.path('amountInCents').options;
    const status = BalanceRequestSchema.path('status').options;

    expect(BalanceRequestSchema.path('userEmail').options).toMatchObject({
      required: true,
      index: true,
    });
    expect(BalanceRequestSchema.path('userName').options.required).toBe(true);
    expect(BalanceRequestSchema.path('userLastName').options.required).toBe(
      true,
    );
    expect(amount).toMatchObject({
      required: true,
      min: 1,
      max: MAX_SAFE_MONEY_CENTS,
      immutable: true,
    });
    expect(amount.validate).toBe(Number.isSafeInteger);
    expect(status).toMatchObject({
      required: true,
      default: 'pending',
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      index: true,
    });
    expect(BalanceRequestSchema.path('adminInCharge').options.default).toBe(
      null,
    );
  });

  it('creates the expected request list indexes', () => {
    expect(BalanceRequestSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ userEmail: 1 }, { background: true }],
        [{ status: 1 }, { background: true }],
        [{ userEmail: 1, createdAt: -1 }, { background: true }],
        [{ status: 1, createdAt: -1 }, { background: true }],
        [{ createdAt: -1 }, { background: true }],
      ]),
    );
  });
});
