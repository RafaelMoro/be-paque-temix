import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, isValidObjectId, Model } from 'mongoose';
import config from '@/config';
import { getBusinessMonthRange } from '@/date-time/date-time.utils';
import { KraftError } from '@/guides/kraft-error';
import {
  MailBalanceRequestCreatedDto,
  MailBalanceRequestDecisionDto,
} from '@/mail/dtos/mail.dto';
import { MailService } from '@/mail/services/mail.service';
import { UsersService } from '@/users/services/users.service';
import {
  BAL_AUTH_001,
  BAL_AUTH_002,
  BAL_BDN_001,
  BAL_BDN_002,
  BAL_BUS_001,
  BAL_BUS_002,
  BAL_BUS_003,
  BAL_NF_001,
  MAX_SAFE_MONEY_CENTS,
  MSG_BALANCE_DATABASE_ERROR,
  MSG_BALANCE_INSUFFICIENT_FUNDS,
  MSG_BALANCE_INVALID_AMOUNT,
  MSG_BALANCE_INVALID_STATE,
  MSG_BALANCE_REQUEST_FORBIDDEN,
  MSG_BALANCE_REQUEST_NOT_FOUND,
  MSG_BALANCE_TRANSACTION_ERROR,
  MSG_BALANCE_USER_NOT_AUTHENTICATED,
} from '../balance.constants';
import {
  BalanceCaller,
  BalanceRequestsFilter,
  FormattedAdminBalanceRequest,
  FormattedBalanceRequest,
} from '../balance.interface';
import { fromMoneyCents, toMoneyCents } from '../balance.utils';
import {
  GetAdminBalanceRequestsQueryDto,
  GetBalanceRequestsQueryDto,
  CreateBalanceRequestDto,
  DecideBalanceRequestDto,
} from '../dtos/balance.dto';
import {
  AdminBalanceRequestResponseDto,
  BalanceRequestResponseDto,
  BalanceResponseDto,
  PaginatedAdminBalanceRequestsResponseDto,
  PaginatedBalanceRequestsResponseDto,
} from '../dtos/balance-responses.dto';
import { Balance, BalanceDoc } from '../entities/balance.entity';
import {
  BalanceRequest,
  BalanceRequestDoc,
} from '../entities/balance-request.entity';

@Injectable()
export class BalanceService {
  constructor(
    @InjectModel(Balance.name) private balanceModel: Model<BalanceDoc>,
    @InjectModel(BalanceRequest.name)
    private balanceRequestModel: Model<BalanceRequestDoc>,
    @InjectConnection() private connection: Connection,
    private usersService: UsersService,
    private mailService: MailService,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async createRequest(
    user: BalanceCaller | undefined,
    dto: CreateBalanceRequestDto,
  ): Promise<BalanceRequestResponseDto> {
    try {
      const caller = this.getCaller(user);
      const request = await this.balanceRequestModel.create({
        userEmail: caller.email,
        userName: caller.name,
        userLastName: caller.lastName,
        amountInCents: toMoneyCents(dto.amount),
        paymentReference: dto.paymentReference,
        status: 'pending',
        adminInCharge: null,
      });

      await this.notifyRequestCreated(caller, request);

      return this.envelope({ request: this.formatRequest(request) });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async getRequestsByUser(
    user: BalanceCaller | undefined,
    filters: GetBalanceRequestsQueryDto,
  ): Promise<PaginatedBalanceRequestsResponseDto> {
    try {
      const caller = this.getCaller(user);
      const normalized = this.normalizeFilters(filters);
      const query = {
        userEmail: caller.email,
        createdAt: this.monthRange(normalized),
      };
      const [requests, total] = await Promise.all([
        this.balanceRequestModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip((normalized.page - 1) * normalized.limit)
          .limit(normalized.limit)
          .exec(),
        this.balanceRequestModel.countDocuments(query).exec(),
      ]);

      return this.envelope({
        requests: requests.map((request) => this.formatRequest(request)),
        total,
        page: normalized.page,
        limit: normalized.limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / normalized.limit),
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async getAllRequests(
    adminUser: BalanceCaller | undefined,
    filters: GetAdminBalanceRequestsQueryDto,
  ): Promise<PaginatedAdminBalanceRequestsResponseDto> {
    try {
      this.getAdminCaller(adminUser);
      const normalized = this.normalizeFilters(filters);
      const query: {
        createdAt: { $gte: Date; $lt: Date };
        status?: 'pending';
      } = { createdAt: this.monthRange(normalized) };
      if (normalized.status === 'pending') query.status = 'pending';

      const [requests, total] = await Promise.all([
        this.balanceRequestModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip((normalized.page - 1) * normalized.limit)
          .limit(normalized.limit)
          .exec(),
        this.balanceRequestModel.countDocuments(query).exec(),
      ]);

      return this.envelope({
        requests: requests.map((request) => this.formatAdminRequest(request)),
        total,
        page: normalized.page,
        limit: normalized.limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / normalized.limit),
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async decideRequest(
    requestId: string,
    adminUser: BalanceCaller | undefined,
    dto: DecideBalanceRequestDto,
  ): Promise<AdminBalanceRequestResponseDto> {
    try {
      const admin = this.getAdminCaller(adminUser);
      const decisionAt = new Date();
      const request =
        dto.action === 'approve'
          ? await this.approveRequest({ requestId, admin, dto, decisionAt })
          : await this.rejectRequest({ requestId, admin, dto, decisionAt });

      await this.notifyRequestDecision(request, dto.action);
      return this.envelope({ request: this.formatAdminRequest(request) });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async cancelRequest(
    requestId: string,
    user: BalanceCaller | undefined,
  ): Promise<BalanceRequestResponseDto> {
    try {
      const caller = this.getCaller(user);
      const request = await this.balanceRequestModel.findById(requestId).exec();
      if (!request) {
        throw new KraftError(
          BAL_NF_001,
          MSG_BALANCE_REQUEST_NOT_FOUND,
          undefined,
          HttpStatus.NOT_FOUND,
        );
      }
      if (request.userEmail !== caller.email) {
        throw new KraftError(
          BAL_AUTH_002,
          MSG_BALANCE_REQUEST_FORBIDDEN,
          undefined,
          HttpStatus.FORBIDDEN,
        );
      }
      if (request.status !== 'pending') {
        throw this.invalidStateError();
      }

      const cancelled = await this.balanceRequestModel
        .findOneAndUpdate(
          { _id: requestId, userEmail: caller.email, status: 'pending' },
          { status: 'cancelled' },
          { new: true },
        )
        .exec();
      if (!cancelled) throw this.invalidStateError();

      return this.envelope({ request: this.formatRequest(cancelled) });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async getRequestByIdAdmin(
    user: BalanceCaller | undefined,
    requestId: string,
  ): Promise<AdminBalanceRequestResponseDto> {
    try {
      this.getAdminCaller(user);
      if (!isValidObjectId(requestId)) {
        throw new KraftError(
          BAL_NF_001,
          MSG_BALANCE_REQUEST_NOT_FOUND,
          undefined,
          HttpStatus.NOT_FOUND,
        );
      }
      const request = await this.balanceRequestModel.findById(requestId).exec();
      if (!request) {
        throw new KraftError(
          BAL_NF_001,
          MSG_BALANCE_REQUEST_NOT_FOUND,
          undefined,
          HttpStatus.NOT_FOUND,
        );
      }

      return this.envelope({ request: this.formatAdminRequest(request) });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async getBalance(
    user: BalanceCaller | undefined,
  ): Promise<BalanceResponseDto> {
    try {
      const caller = this.getCaller(user);
      const balance = await this.balanceModel
        .findOne({ userEmail: caller.email })
        .lean()
        .exec();
      return this.envelope({
        balance: { amount: fromMoneyCents(balance?.amountInCents ?? 0) },
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async assertSufficientBalance(
    userEmail: string,
    amount: number,
  ): Promise<BalanceResponseDto> {
    try {
      const amountInCents = toMoneyCents(amount);
      const balance = await this.balanceModel
        .findOne({ userEmail })
        .lean()
        .exec();
      if (!balance || balance.amountInCents < amountInCents) {
        throw this.insufficientFundsError();
      }
      return this.envelope({
        balance: { amount: fromMoneyCents(balance.amountInCents) },
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async debitBalance({
    userEmail,
    amount,
    session,
  }: {
    userEmail: string;
    amount: number;
    session?: ClientSession;
  }): Promise<BalanceResponseDto> {
    try {
      const amountInCents = toMoneyCents(amount);
      const balance = await this.balanceModel
        .findOneAndUpdate(
          { userEmail, amountInCents: { $gte: amountInCents } },
          { $inc: { amountInCents: -amountInCents } },
          { new: true, session },
        )
        .exec();
      if (!balance) throw this.insufficientFundsError();

      return this.envelope({
        balance: { amount: fromMoneyCents(balance.amountInCents) },
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  private async approveRequest({
    requestId,
    admin,
    dto,
    decisionAt,
  }: {
    requestId: string;
    admin: BalanceCaller;
    dto: DecideBalanceRequestDto;
    decisionAt: Date;
  }): Promise<BalanceRequestDoc> {
    try {
      return await this.connection.transaction(async (session) => {
        const request = await this.balanceRequestModel
          .findOneAndUpdate(
            { _id: requestId, status: 'pending' },
            {
              status: 'approved',
              adminInCharge: admin.email,
              decisionReason: dto.reason,
              decisionAt,
              paymentReference: dto.paymentReference,
            },
            { new: true, session },
          )
          .exec();
        if (!request) throw this.invalidStateError();

        const maximumCurrentBalance =
          MAX_SAFE_MONEY_CENTS - request.amountInCents;
        const balance = await this.balanceModel
          .findOneAndUpdate(
            {
              userEmail: request.userEmail,
              $or: [
                { amountInCents: { $lte: maximumCurrentBalance } },
                { amountInCents: { $exists: false } },
              ],
            },
            {
              $setOnInsert: { userEmail: request.userEmail },
              $inc: { amountInCents: request.amountInCents },
            },
            { new: true, upsert: true, session },
          )
          .exec();
        if (!balance || balance.amountInCents > MAX_SAFE_MONEY_CENTS) {
          throw new KraftError(BAL_BDN_002, MSG_BALANCE_TRANSACTION_ERROR);
        }

        return request;
      });
    } catch (error) {
      if (error instanceof KraftError) throw error;
      throw new KraftError(BAL_BDN_002, MSG_BALANCE_TRANSACTION_ERROR, error);
    }
  }

  private async rejectRequest({
    requestId,
    admin,
    dto,
    decisionAt,
  }: {
    requestId: string;
    admin: BalanceCaller;
    dto: DecideBalanceRequestDto;
    decisionAt: Date;
  }): Promise<BalanceRequestDoc> {
    const request = await this.balanceRequestModel
      .findOneAndUpdate(
        { _id: requestId, status: 'pending' },
        {
          status: 'rejected',
          adminInCharge: admin.email,
          decisionReason: dto.reason,
          decisionAt,
        },
        { new: true },
      )
      .exec();
    if (!request) throw this.invalidStateError();
    return request;
  }

  private getCaller(user: BalanceCaller | undefined): BalanceCaller {
    if (!user?.email) {
      throw new KraftError(
        BAL_AUTH_001,
        MSG_BALANCE_USER_NOT_AUTHENTICATED,
        undefined,
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }

  private getAdminCaller(user: BalanceCaller | undefined): BalanceCaller {
    const caller = this.getCaller(user);
    if (!caller.role?.includes('admin')) {
      throw new KraftError(
        BAL_AUTH_002,
        MSG_BALANCE_REQUEST_FORBIDDEN,
        undefined,
        HttpStatus.FORBIDDEN,
      );
    }
    return caller;
  }

  private normalizeFilters(
    filters: GetBalanceRequestsQueryDto | GetAdminBalanceRequestsQueryDto,
  ): BalanceRequestsFilter {
    const { month, year } = getBusinessMonthRange({
      businessTimezone: this.configService.businessTimezone!,
      month: filters.month,
      year: filters.year,
    });
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 10);
    return {
      month,
      year,
      page,
      limit,
      status:
        'status' in filters && filters.status === 'pending'
          ? 'pending'
          : undefined,
    };
  }

  private monthRange(filters: BalanceRequestsFilter): {
    $gte: Date;
    $lt: Date;
  } {
    const { startOfMonth, startOfNextMonth } = getBusinessMonthRange({
      businessTimezone: this.configService.businessTimezone!,
      month: filters.month,
      year: filters.year,
    });

    return {
      $gte: startOfMonth,
      $lt: startOfNextMonth,
    };
  }

  private formatRequest(request: BalanceRequestDoc): FormattedBalanceRequest {
    return {
      id: request._id.toString(),
      amount: fromMoneyCents(request.amountInCents),
      paymentReference: request.paymentReference,
      status: request.status,
      decisionReason: request.decisionReason,
      decisionAt: request.decisionAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private formatAdminRequest(
    request: BalanceRequestDoc,
  ): FormattedAdminBalanceRequest {
    return {
      ...this.formatRequest(request),
      userEmail: request.userEmail,
      userName: `${request.userName} ${request.userLastName}`.trim(),
      adminInCharge: request.adminInCharge,
    };
  }

  private envelope<T>(data: T): {
    version: string;
    data: T;
    message: null;
    error: null;
  } {
    return {
      version: this.configService.version!,
      data,
      message: null,
      error: null,
    };
  }

  private async notifyRequestCreated(
    caller: BalanceCaller,
    request: BalanceRequestDoc,
  ): Promise<void> {
    try {
      const admins = await this.usersService.findAdmins();
      const adminEmails = admins.map((admin) => admin.email);
      if (adminEmails.length === 0) return;
      const payload: MailBalanceRequestCreatedDto = {
        adminEmails,
        requesterName: `${caller.name} ${caller.lastName}`.trim(),
        amount: fromMoneyCents(request.amountInCents),
        paymentReference: request.paymentReference,
        createdAt: request.createdAt,
        requestId: request._id.toString(),
      };
      await this.mailService.sendBalanceRequestCreatedEmail(payload);
    } catch (error) {
      console.error(
        'Failed to send balance request created notification',
        error,
      );
    }
  }

  private async notifyRequestDecision(
    request: BalanceRequestDoc,
    action: 'approve' | 'reject',
  ): Promise<void> {
    try {
      const payload: MailBalanceRequestDecisionDto = {
        email: request.userEmail,
        name: `${request.userName} ${request.userLastName}`.trim(),
        action: action === 'approve' ? 'approved' : 'rejected',
        amount: fromMoneyCents(request.amountInCents),
        reason: request.decisionReason,
      };
      await this.mailService.sendBalanceRequestDecisionEmail(payload);
    } catch (error) {
      console.error(
        'Failed to send balance request decision notification',
        error,
      );
    }
  }

  private insufficientFundsError(): KraftError {
    return new KraftError(BAL_BUS_001, MSG_BALANCE_INSUFFICIENT_FUNDS);
  }

  private invalidStateError(): KraftError {
    return new KraftError(
      BAL_BUS_002,
      MSG_BALANCE_INVALID_STATE,
      undefined,
      HttpStatus.CONFLICT,
    );
  }

  private rethrowDatabaseError(error: unknown): never {
    if (error instanceof KraftError) throw error;
    if (error instanceof RangeError) {
      throw new KraftError(BAL_BUS_003, MSG_BALANCE_INVALID_AMOUNT, error);
    }
    throw new KraftError(BAL_BDN_001, MSG_BALANCE_DATABASE_ERROR, error);
  }
}
