import { HttpStatus } from '@nestjs/common';
import { KraftError } from '@/guides/kraft-error';
import {
  BAL_AUTH_001,
  BAL_AUTH_002,
  BAL_BUS_001,
  BAL_NF_001,
  MAX_SAFE_MONEY_CENTS,
  MSG_BALANCE_INSUFFICIENT_FUNDS,
  MSG_BALANCE_REQUEST_FORBIDDEN,
  MSG_BALANCE_REQUEST_NOT_FOUND,
  MSG_BALANCE_USER_NOT_AUTHENTICATED,
} from '../balance.constants';
import { getBusinessMonthRange } from '@/date-time/date-time.utils';
import { BalanceCaller } from '../balance.interface';
import { BalanceService } from './balance.service';

const caller: BalanceCaller = {
  email: 'user@example.com',
  name: 'Jane',
  lastName: 'Doe',
  role: ['user'],
};
const admin: BalanceCaller = {
  ...caller,
  email: 'admin@example.com',
  role: ['admin'],
};
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

const listQuery = (value: unknown): Record<string, jest.Mock> => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
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
      { version: '1.5.0', businessTimezone: 'America/Mexico_City' } as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('includes the requestId in the created-request notification payload', async () => {
    requestModel.create.mockResolvedValue(request);
    usersService.findAdmins.mockResolvedValue([{ email: admin.email }]);

    await service.createRequest(caller, {
      amount: 1.159,
      paymentReference: 'SPEI-123',
    });

    expect(mailService.sendBalanceRequestCreatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'request-id' }),
    );
  });

  it('resolves createRequest even when the notification email fails', async () => {
    requestModel.create.mockResolvedValue(request);
    usersService.findAdmins.mockResolvedValue([{ email: admin.email }]);
    mailService.sendBalanceRequestCreatedEmail.mockRejectedValue(
      new Error('Resend failed'),
    );

    await expect(
      service.createRequest(caller, {
        amount: 1.159,
        paymentReference: 'SPEI-123',
      }),
    ).resolves.toMatchObject({ data: { request: { status: 'pending' } } });
  });

  it('reads an implicit zero balance without creating a wallet', async () => {
    balanceModel.findOne.mockReturnValue({ lean: () => query(null) });

    await expect(service.getBalance(caller)).resolves.toMatchObject({
      data: { balance: { amount: 0 } },
    });
    expect(balanceModel.findOne).toHaveBeenCalledWith({
      userEmail: caller.email,
    });
  });

  it('lists owner requests with explicit business-month UTC bounds', async () => {
    requestModel.find.mockReturnValue(listQuery([]));
    requestModel.countDocuments.mockReturnValue(query(0));

    await service.getRequestsByUser(caller, { month: 2, year: 2026 });

    const expectedQuery = {
      userEmail: caller.email,
      createdAt: {
        $gte: new Date('2026-02-01T06:00:00.000Z'),
        $lt: new Date('2026-03-01T06:00:00.000Z'),
      },
    };
    expect(requestModel.find).toHaveBeenCalledWith(expectedQuery);
    expect(requestModel.countDocuments).toHaveBeenCalledWith(expectedQuery);
  });

  it('lists admin requests with the same explicit business-month UTC bounds', async () => {
    requestModel.find.mockReturnValue(listQuery([]));
    requestModel.countDocuments.mockReturnValue(query(0));

    await service.getAllRequests(admin, {
      month: 2,
      year: 2026,
      status: 'pending',
    });

    const expectedQuery = {
      createdAt: {
        $gte: new Date('2026-02-01T06:00:00.000Z'),
        $lt: new Date('2026-03-01T06:00:00.000Z'),
      },
      status: 'pending',
    };
    expect(requestModel.find).toHaveBeenCalledWith(expectedQuery);
    expect(requestModel.countDocuments).toHaveBeenCalledWith(expectedQuery);
  });

  it('defaults omitted month/year from the business timezone near a local boundary', async () => {
    requestModel.find.mockReturnValue(listQuery([]));
    requestModel.countDocuments.mockReturnValue(query(0));
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-01T05:59:59.999Z'));

    await service.getRequestsByUser(caller, {});

    expect(requestModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: {
          $gte: new Date('2026-01-01T06:00:00.000Z'),
          $lt: new Date('2026-02-01T06:00:00.000Z'),
        },
      }),
    );
  });

  it('defaults partial month/year filters from the business timezone', async () => {
    requestModel.find.mockReturnValue(listQuery([]));
    requestModel.countDocuments.mockReturnValue(query(0));
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-01T05:59:59.999Z'));

    await service.getRequestsByUser(caller, { month: 6 });
    expect(requestModel.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        createdAt: {
          $gte: new Date('2026-06-01T06:00:00.000Z'),
          $lt: new Date('2026-07-01T06:00:00.000Z'),
        },
      }),
    );

    await service.getRequestsByUser(caller, { year: 2027 });
    expect(requestModel.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        createdAt: {
          $gte: new Date('2027-01-01T06:00:00.000Z'),
          $lt: new Date('2027-02-01T06:00:00.000Z'),
        },
      }),
    );
  });

  it('uses named-zone DST conversion through the shared range utility', () => {
    expect(
      getBusinessMonthRange({
        businessTimezone: 'America/New_York',
        month: 3,
        year: 2026,
      }),
    ).toMatchObject({
      startOfMonth: new Date('2026-03-01T05:00:00.000Z'),
      startOfNextMonth: new Date('2026-04-01T04:00:00.000Z'),
    });
  });

  it('keeps formatted timestamps as Date values', async () => {
    const decidedRequest = {
      ...request,
      status: 'approved',
      adminInCharge: admin.email,
      decisionAt: new Date('2026-07-02T00:00:00.000Z'),
    };
    requestModel.find.mockReturnValue(listQuery([decidedRequest]));
    requestModel.countDocuments.mockReturnValue(query(1));

    const ownerResult = await service.getRequestsByUser(caller, {
      month: 7,
      year: 2026,
    });
    const adminResult = await service.getAllRequests(admin, {
      month: 7,
      year: 2026,
    });

    expect(ownerResult.data.requests[0].createdAt).toBeInstanceOf(Date);
    expect(ownerResult.data.requests[0].updatedAt).toBeInstanceOf(Date);
    expect(ownerResult.data.requests[0].decisionAt).toBeInstanceOf(Date);
    expect(adminResult.data.requests[0].createdAt).toBeInstanceOf(Date);
    expect(adminResult.data.requests[0].updatedAt).toBeInstanceOf(Date);
    expect(adminResult.data.requests[0].decisionAt).toBeInstanceOf(Date);
  });

  it('approves and credits a request in a single transaction', async () => {
    const approvedRequest = {
      ...request,
      status: 'approved',
      adminInCharge: admin.email,
    };
    const session = { id: 'session' };
    connection.transaction.mockImplementation(async (callback: any) =>
      callback(session),
    );
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

    await expect(
      service.cancelRequest('request-id', caller),
    ).resolves.toMatchObject({
      data: { request: { status: 'cancelled' } },
    });
    await expect(
      service.cancelRequest('request-id', {
        ...caller,
        email: 'other@example.com',
      }),
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
    ).rejects.toMatchObject({
      code: BAL_BUS_001,
      message: MSG_BALANCE_INSUFFICIENT_FUNDS,
    });
  });

  it('lets an admin fetch another user request by id in admin shape', async () => {
    requestModel.findById.mockReturnValue(query(request));

    await expect(
      service.getRequestByIdAdmin(admin, '507f1f77bcf86cd799439011'),
    ).resolves.toMatchObject({
      data: {
        request: {
          userEmail: caller.email,
          userName: 'Jane Doe',
          adminInCharge: null,
        },
      },
    });
    expect(requestModel.findById).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
    );
  });

  it('forbids a non-admin caller from fetching a request by id', async () => {
    await expect(
      service.getRequestByIdAdmin(caller, '507f1f77bcf86cd799439011'),
    ).rejects.toMatchObject({
      code: BAL_AUTH_002,
      message: MSG_BALANCE_REQUEST_FORBIDDEN,
      status: HttpStatus.FORBIDDEN,
    });
    expect(requestModel.findById).not.toHaveBeenCalled();
  });

  it('requires authentication to fetch a request by id', async () => {
    await expect(
      service.getRequestByIdAdmin(undefined, '507f1f77bcf86cd799439011'),
    ).rejects.toMatchObject({
      code: BAL_AUTH_001,
      message: MSG_BALANCE_USER_NOT_AUTHENTICATED,
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('returns 404 when no request matches a well-formed id', async () => {
    requestModel.findById.mockReturnValue(query(null));

    await expect(
      service.getRequestByIdAdmin(admin, '507f1f77bcf86cd799439011'),
    ).rejects.toMatchObject({
      code: BAL_NF_001,
      message: MSG_BALANCE_REQUEST_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('returns 404 instead of a database error for a malformed id', async () => {
    await expect(
      service.getRequestByIdAdmin(admin, 'not-an-object-id'),
    ).rejects.toMatchObject({
      code: BAL_NF_001,
      message: MSG_BALANCE_REQUEST_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
    expect(requestModel.findById).not.toHaveBeenCalled();
  });

  it('does not approve a credit that exceeds the safe wallet limit', async () => {
    const session = { id: 'session' };
    connection.transaction.mockImplementation(async (callback: any) =>
      callback(session),
    );
    requestModel.findOneAndUpdate.mockReturnValue(
      query({ ...request, amountInCents: 1 }),
    );
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
