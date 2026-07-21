import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateBalanceRequestDto,
  DecideBalanceRequestDto,
  GetAdminBalanceRequestsQueryDto,
  GetBalanceRequestsQueryDto,
} from './balance.dto';

async function validationErrors(value: object): Promise<number> {
  return (await validate(value)).length;
}

describe('balance DTOs', () => {
  it('accepts a valid balance request amount and optional reference', async () => {
    const dto = plainToInstance(CreateBalanceRequestDto, {
      amount: 100000,
      paymentReference: 'SPEI-123',
    });

    expect(await validationErrors(dto)).toBe(0);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 100000.01])(
    'rejects invalid balance amount %p',
    async (amount) => {
      const dto = plainToInstance(CreateBalanceRequestDto, { amount });
      expect(await validationErrors(dto)).toBeGreaterThan(0);
    },
  );

  it('coerces and validates pagination query values', async () => {
    const dto = plainToInstance(GetBalanceRequestsQueryDto, {
      month: '6',
      year: '2026',
      page: '2',
      limit: '25',
    });

    expect(dto).toMatchObject({ month: 6, year: 2026, page: 2, limit: 25 });
    expect(await validationErrors(dto)).toBe(0);
  });

  it.each([
    { month: '0' },
    { month: '13' },
    { year: '0' },
    { page: '0' },
    { limit: '-1' },
  ])('rejects an invalid request list query: %o', async (query) => {
    expect(
      await validationErrors(
        plainToInstance(GetBalanceRequestsQueryDto, query),
      ),
    ).toBeGreaterThan(0);
  });

  it('accepts only supported admin request filters', async () => {
    expect(
      await validationErrors(
        plainToInstance(GetAdminBalanceRequestsQueryDto, { status: 'pending' }),
      ),
    ).toBe(0);
    expect(
      await validationErrors(
        plainToInstance(GetAdminBalanceRequestsQueryDto, { status: 'invalid' }),
      ),
    ).toBeGreaterThan(0);
  });

  it('requires a reference only when approving', async () => {
    expect(
      await validationErrors(
        plainToInstance(DecideBalanceRequestDto, {
          action: 'approve',
          paymentReference: 'SPEI-456',
        }),
      ),
    ).toBe(0);
    expect(
      await validationErrors(
        plainToInstance(DecideBalanceRequestDto, { action: 'approve' }),
      ),
    ).toBeGreaterThan(0);
    expect(
      await validationErrors(
        plainToInstance(DecideBalanceRequestDto, { action: 'reject' }),
      ),
    ).toBe(0);
    expect(
      await validationErrors(
        plainToInstance(DecideBalanceRequestDto, {
          action: 'reject',
          paymentReference: 'SPEI-456',
        }),
      ),
    ).toBeGreaterThan(0);
  });

  it('rejects unsupported decision actions', async () => {
    expect(
      await validationErrors(
        plainToInstance(DecideBalanceRequestDto, { action: 'cancel' }),
      ),
    ).toBeGreaterThan(0);
  });
});
