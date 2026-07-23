import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import { BalanceService } from '../services/balance.service';
import { BalanceController } from './balance.controller';

describe('BalanceController', () => {
  const user = {
    email: 'user@example.com',
    name: 'Jane',
    lastName: 'Doe',
    role: ['user'],
  };
  const admin = { ...user, role: ['admin'] };
  const request = { user } as any;
  const adminRequest = { user: admin } as any;
  const balanceService = {
    createRequest: jest.fn(),
    getRequestsByUser: jest.fn(),
    getAllRequests: jest.fn(),
    getRequestByIdAdmin: jest.fn(),
    decideRequest: jest.fn(),
    cancelRequest: jest.fn(),
    getBalance: jest.fn(),
  } as unknown as jest.Mocked<BalanceService>;
  const controller = new BalanceController(balanceService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards user routes without controller business logic', async () => {
    const createDto = { amount: 100 } as any;
    const query = { page: 2 } as any;
    balanceService.createRequest.mockResolvedValue({} as any);
    balanceService.getRequestsByUser.mockResolvedValue({} as any);
    balanceService.cancelRequest.mockResolvedValue({} as any);
    balanceService.getBalance.mockResolvedValue({} as any);

    await controller.createRequest(createDto, request);
    await controller.getRequests(query, request);
    await controller.cancelRequest('request-id', request);
    await controller.getBalance(request);

    expect(balanceService.createRequest).toHaveBeenCalledWith(user, createDto);
    expect(balanceService.getRequestsByUser).toHaveBeenCalledWith(user, query);
    expect(balanceService.cancelRequest).toHaveBeenCalledWith(
      'request-id',
      user,
    );
    expect(balanceService.getBalance).toHaveBeenCalledWith(user);
  });

  it('forwards admin routes without altering caller or DTO values', async () => {
    const query = { status: 'pending' } as any;
    const dto = { action: 'approve', paymentReference: 'SPEI-123' } as any;
    balanceService.getAllRequests.mockResolvedValue({} as any);
    balanceService.getRequestByIdAdmin.mockResolvedValue({} as any);
    balanceService.decideRequest.mockResolvedValue({} as any);

    await controller.getAdminRequests(query, adminRequest);
    await controller.getAdminRequestById('request-id', adminRequest);
    await controller.decideRequest('request-id', dto, adminRequest);

    expect(balanceService.getAllRequests).toHaveBeenCalledWith(admin, query);
    expect(balanceService.getRequestByIdAdmin).toHaveBeenCalledWith(
      admin,
      'request-id',
    );
    expect(balanceService.decideRequest).toHaveBeenCalledWith(
      'request-id',
      admin,
      dto,
    );
  });

  it('applies JWT protection to the controller and admin guards to admin routes', () => {
    expect(Reflect.getMetadata(PATH_METADATA, BalanceController)).toBe(
      'balance',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, BalanceController)).toEqual([
      JwtGuard,
    ]);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        BalanceController.prototype.getAdminRequests,
      ),
    ).toEqual([JwtGuard, RolesGuard]);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        BalanceController.prototype.getAdminRequestById,
      ),
    ).toEqual([JwtGuard, RolesGuard]);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        BalanceController.prototype.decideRequest,
      ),
    ).toEqual([JwtGuard, RolesGuard]);
  });
});
