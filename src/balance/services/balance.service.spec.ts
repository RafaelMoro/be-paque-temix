/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpStatus } from '@nestjs/common';
import { KraftError } from '@/guides/kraft-error';
import {
  BAL_BUS_001,
  MAX_SAFE_MONEY_CENTS,
  MSG_BALANCE_INSUFFICIENT_FUNDS,
} from '../balance.constants';
import { BalanceCaller } from '../balance.interface';
import { BalanceService } from './balance.service';

const caller: BalanceCaller = {
  email: 'user@example.com',
  name: 'Jane',
  lastName: 'Doe',
  role: ['user'],
};
const admin: BalanceCaller = { ...caller, email: 'admin@example.com', role: ['admin'] };
const request = {
  _id: { toString: () => 'request-id' },
  userEmail: caller.email,
  userName: caller.name,
  userLastName: caller.lastName,
  amountInCents: 115,
  paymentReference: 'SPEI-123',
  status: 'pending',
  adminInCharge: null,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
};

const query = (value: unknown): { exec: jest.Mock } => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('BalanceService', () => {
  let service: BalanceService;
  let balanceModel: any;
  let requestModel: any;
  let connection: any;
  let usersService: any;
  let mailService: any;

  beforeEach(() => {
    balanceModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    requestModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    connection = { transaction: jest.fn() };
    usersService = { findAdmins: jest.fn().mockResolvedValue([]) };
    mailService = {
      sendBalanceRequestCreatedEmail: jest.fn(),
      sendBalanceRequestDecisionEmail: jest.fn(),
    };
    service = new BalanceService(
      balanceModel,
      requestModel,
      connection,
      usersService,
      mailService,
      { version: '1.5.0' } as any,
    );
  });

  it('creates a pending request in cents with an explicit null admin', async () => {
    requestModel.create.mockResolvedValue(request);

    const result = await service.createRequest(caller, {
      amount: 1.159,
      paymentReference: 'SPEI-123',
    });

    expect(requestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: caller.email,
        userName: caller.name,
        userLastName: caller.lastName,
        amountInCents: 115,
        status: 'pending',
        adminInCharge: null,
      }),
    );
    expect(result.data.request).toEqual(
      expect.objectContaining({ amount: 1.15, status: 'pending' }),
    );
    expect(result.data.request).not.toHaveProperty('adminInCharge');
  });

  it('reads an implicit zero balance without creating a wallet', async () => {
    balanceModel.findOne.mockReturnValue({ lean: () => query(null) });

    await expect(service.getBalance(caller)).resolves.toMatchObject({
      data: { balance: { amount: 0 } },
    });
    expect(balanceModel.findOne).toHaveBeenCalledWith({ userEmail: caller.email });
  });

  it('approves and credits a request in a single transaction', async () => {
    const approvedRequest = { ...request, status: 'approved', adminInCharge: admin.email };
    const session = { id: 'session' };
    connection.transaction.mockImplementation(async (callback: any) => callback(session));
    requestModel.findOneAndUpdate.mockReturnValue(query(approvedRequest));
    balanceModel.findOneAndUpdate.mockReturnValue(
      query({ amountInCents: 115 }),
    );

    const result = await service.decideRequest('request-id', admin, {
      action: 'approve',
      paymentReference: 'VERIFIED-REF',
    });

    expect(connection.transaction).toHaveBeenCalled();
    expect(requestModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'request-id', status: 'pending' },
      expect.objectContaining({
        status: 'approved',
        adminInCharge: admin.email,
        paymentReference: 'VERIFIED-REF',
      }),
      expect.objectContaining({ new: true, session }),
    );
    expect(balanceModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: caller.email }),
      expect.objectContaining({ $inc: { amountInCents: 115 } }),
      expect.objectContaining({ new: true, upsert: true, session }),
    );
    expect(result.data.request).toMatchObject({
      userName: 'Jane Doe',
      adminInCharge: admin.email,
    });
  });

  it('rejects without touching the wallet', async () => {
    requestModel.findOneAndUpdate.mockReturnValue(
      query({ ...request, status: 'rejected', adminInCharge: admin.email }),
    );

    await service.decideRequest('request-id', admin, {
      action: 'reject',
      reason: 'No se pudo verificar el pago.',
    });

    expect(connection.transaction).not.toHaveBeenCalled();
    expect(balanceModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('only permits the owner to cancel a pending request', async () => {
    requestModel.findById.mockReturnValue(query(request));
    requestModel.findOneAndUpdate.mockReturnValue(
      query({ ...request, status: 'cancelled' }),
    );

    await expect(service.cancelRequest('request-id', caller)).resolves.toMatchObject({
      data: { request: { status: 'cancelled' } },
    });
    await expect(
      service.cancelRequest('request-id', { ...caller, email: 'other@example.com' }),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(mailService.sendBalanceRequestDecisionEmail).not.toHaveBeenCalled();
  });

  it('performs guarded balance debits and reports insufficient funds', async () => {
    balanceModel.findOneAndUpdate.mockReturnValue(query({ amountInCents: 85 }));

    await expect(
      service.debitBalance({ userEmail: caller.email, amount: 0.3 }),
    ).resolves.toMatchObject({ data: { balance: { amount: 0.85 } } });
    expect(balanceModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userEmail: caller.email, amountInCents: { $gte: 30 } },
      { $inc: { amountInCents: -30 } },
      { new: true, session: undefined },
    );

    balanceModel.findOneAndUpdate.mockReturnValue(query(null));
    await expect(
      service.debitBalance({ userEmail: caller.email, amount: 1 }),
    ).rejects.toMatchObject({ code: BAL_BUS_001, message: MSG_BALANCE_INSUFFICIENT_FUNDS });
  });

  it('does not approve a credit that exceeds the safe wallet limit', async () => {
    const session = { id: 'session' };
    connection.transaction.mockImplementation(async (callback: any) => callback(session));
    requestModel.findOneAndUpdate.mockReturnValue(query({ ...request, amountInCents: 1 }));
    balanceModel.findOneAndUpdate.mockReturnValue(
      query({ amountInCents: MAX_SAFE_MONEY_CENTS + 1 }),
    );

    await expect(
      service.decideRequest('request-id', admin, {
        action: 'approve',
        paymentReference: 'VERIFIED-REF',
      }),
    ).rejects.toBeInstanceOf(KraftError);
  });
});
