import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import axios from 'axios';
import { Guide, GuideDoc } from '../entities/guide.entity';
import { KraftIdCounter } from '../entities/kraft-id-counter.entity';
import { CreateGuideDto } from '../dtos/guides-db.dto';
import {
  GuideResponseDto,
  PaginatedGuidesResponseDto,
} from '../dtos/guides-db-responses.dto';
import {
  GetAdminGuidesQueryDto,
  GetGuidesQueryDto,
  AddCommentDto,
  UpdateGuideStatusDto,
} from '../dtos/guides-db.dto';
import { ProviderResult, RetryPayload } from '../guides.interface';
import { KraftError } from '../kraft-error';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { T1Service } from '@/t1/services/t1.service';
import { PakkeService } from '@/pakke/services/pakke.service';
import { ManuableService } from '@/manuable/services/manuable.service';
import { UsersService } from '@/users/services/users.service';
import { ProviderSource } from '@/global.interface';
import config from '@/config';
import * as CONST from '../guides-db.constants';

@Injectable()
export class GuidesDbService {
  constructor(
    @InjectModel(Guide.name) private guideModel: Model<GuideDoc>,
    @InjectModel(KraftIdCounter.name)
    private kraftIdCounterModel: Model<KraftIdCounter>,
    private readonly guiaEnviaService: GuiaEnviaService,
    private readonly t1Service: T1Service,
    private readonly pakkeService: PakkeService,
    private readonly manuableService: ManuableService,
    private readonly usersService: UsersService,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async createGuide(
    user: { email?: string } | undefined,
    payload: CreateGuideDto,
  ): Promise<GuideResponseDto> {
    try {
      if (!user?.email) {
        throw new KraftError(
          CONST.GDE_AUTH_001,
          CONST.MSG_USER_NOT_AUTHENTICATED,
        );
      }

      const dbUser = await this.usersService.findByEmail(user.email);
      if (!dbUser) {
        throw new KraftError(CONST.GDE_AUTH_001, CONST.MSG_USER_NOT_FOUND);
      }

      const kraftId = await this.generateKraftId();
      const providerResult = await this.callProviderApi(payload);

      const guide = await this.guideModel.create({
        userId: dbUser._id,
        kraftId,
        provider: payload.provider,
        status: providerResult.success ? 'created' : 'failed',
        externalId: providerResult.externalId || null,
        isProviderTrackingSynced: !!providerResult.externalId,
        origin: payload.origin,
        destination: payload.destination,
        parcel: payload.parcel,
        quoteData: { quoteId: payload.quoteId },
        labelUrl: providerResult.labelUrl,
        failureInfo: providerResult.success
          ? undefined
          : {
              errorDetails: providerResult.error || CONST.MSG_PROVIDER_ERROR,
              errorCode: providerResult.errorCode || CONST.GDE_PVR_001,
              providerResponse: providerResult.response || {},
              timestamp: new Date(),
            },
        retries: { retryAttempts: [], retryCount: 0 },
        comments: [],
      });

      return this.formatGuideResponse(guide, providerResult);
    } catch (error) {
      if (error instanceof KraftError) throw error;
      throw new KraftError(
        CONST.GDE_BDN_001,
        CONST.MSG_FAILED_CREATE_GUIDE,
        error,
      );
    }
  }

  async getGuidesByUser(
    user: { email?: string } | undefined,
    filters: GetGuidesQueryDto,
  ): Promise<PaginatedGuidesResponseDto> {
    const userId = await this.getUserId(user);
    const query = this.buildBaseQuery(filters);
    query.userId = userId;
    return this.executePaginatedQuery(query, filters);
  }

  async getAllGuides(
    filters: GetAdminGuidesQueryDto,
    adminUser: { email?: string } | undefined,
  ): Promise<PaginatedGuidesResponseDto> {
    const query = this.buildBaseQuery(filters);

    if (filters.scope === 'own') {
      const adminId = await this.getUserId(adminUser);
      query.userId = adminId;
    } else if (filters.scope === 'all' && filters.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }

    const now = new Date();
    const targetMonth = filters.month || now.getMonth() + 1;
    const targetYear = filters.year || now.getFullYear();
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };

    return this.executePaginatedQuery(query, filters);
  }

  async getGuideById(
    guideId: string,
    user: { email?: string } | undefined,
    isAdmin: boolean,
  ): Promise<GuideResponseDto> {
    const userId = await this.getUserId(user);
    const guide = await this.findAccessibleGuide({ guideId, userId, isAdmin });

    return this.formatGuideResponse(guide);
  }

  /**
   * Retries a failed guide by re-calling the provider API.
   * Validates eligibility (max attempts, cooldown) before retrying.
   * Updates guide status on success or records retry attempt on failure.
   */
  async retryFailedGuide(
    guideId: string,
    user: { email?: string } | undefined,
  ): Promise<GuideResponseDto> {
    const userId = await this.getUserId(user);
    const guide = await this.findAccessibleGuide({
      guideId,
      userId,
      isAdmin: false,
    });

    const eligibility = this.checkRetryEligibility(guide);
    if (!eligibility.eligible) {
      throw new KraftError(
        CONST.GDE_RTL_001,
        eligibility.reason || CONST.MSG_NOT_ELIGIBLE_RETRY,
      );
    }

    const retryPayload: RetryPayload = {
      provider: guide.provider as 'GE' | 'TONE' | 'Pkk' | 'Mn',
      quoteId: guide.quoteData.quoteId,
      origin: guide.origin,
      destination: guide.destination,
      parcel: guide.parcel,
      notifyMe: false,
    };

    const providerResult = await this.callProviderApi(
      retryPayload as unknown as CreateGuideDto,
    );

    const retryAttempt = {
      attemptNumber: guide.retries.retryCount + 1,
      timestamp: new Date(),
      userId,
      error: providerResult.error || CONST.MSG_RETRY_FAILED,
      errorCode: providerResult.errorCode || CONST.GDE_PVR_001,
    };

    if (providerResult.success) {
      await this.guideModel.findByIdAndUpdate(guide._id, {
        $set: {
          status: 'created',
          externalId: providerResult.externalId || guide.externalId,
          labelUrl: providerResult.labelUrl || guide.labelUrl,
          isProviderTrackingSynced: !!providerResult.externalId,
          failureInfo: null,
          providerStatus: null,
          'retries.lastRetryAt': new Date(),
        },
        $push: { 'retries.retryAttempts': retryAttempt },
        $inc: { 'retries.retryCount': 1 },
      });
    } else {
      await this.guideModel.findByIdAndUpdate(guide._id, {
        $set: { 'retries.lastRetryAt': new Date() },
        $push: { 'retries.retryAttempts': retryAttempt },
        $inc: { 'retries.retryCount': 1 },
      });
    }

    const updated = await this.guideModel.findById(guide._id);
    return this.formatGuideResponse(updated!);
  }

  /**
   * Checks if a guide is eligible for retry.
   * Enforces max retry attempts (10) and cooldown period (5 minutes).
   */
  checkRetryEligibility(guide: GuideDoc): {
    eligible: boolean;
    reason?: string;
  } {
    if (guide.retries.retryCount >= CONST.RETRY_MAX_ATTEMPTS) {
      return {
        eligible: false,
        reason: `Maximum retry attempts (${CONST.RETRY_MAX_ATTEMPTS}) reached`,
      };
    }

    if (guide.retries.lastRetryAt) {
      const timeSinceLastRetry =
        Date.now() - guide.retries.lastRetryAt.getTime();
      if (timeSinceLastRetry < CONST.RETRY_COOLDOWN_MS) {
        const remainingMs = CONST.RETRY_COOLDOWN_MS - timeSinceLastRetry;
        const remainingSec = Math.ceil(remainingMs / 1000);
        return {
          eligible: false,
          reason: `Cooldown period active. Retry available in ${remainingSec} seconds`,
        };
      }
    }

    return { eligible: true };
  }

  /**
   * Syncs guide status from the provider (GE only).
   * Updates providerStatus, isProviderTrackingSynced, and lastSyncTimestamp.
   */
  async syncGuideWithProvider(
    guideId: string,
    user: { email?: string } | undefined,
    isAdmin: boolean,
  ): Promise<GuideResponseDto> {
    const userId = await this.getUserId(user);
    const guide = await this.findAccessibleGuide({ guideId, userId, isAdmin });

    if (!guide.externalId) {
      throw new KraftError(CONST.GDE_NF_002, CONST.MSG_NO_EXTERNAL_TRACKING_ID);
    }

    const providerStatus = await this.fetchProviderStatus(
      guide.provider,
      guide.externalId,
    );

    await this.guideModel.findByIdAndUpdate(guide._id, {
      $set: {
        providerStatus,
        isProviderTrackingSynced: true,
        lastSyncTimestamp: new Date(),
      },
    });

    const updated = await this.guideModel.findById(guide._id);
    return this.formatGuideResponse(updated!);
  }

  /**
   * Adds an admin comment to a guide.
   */
  async addComment(
    guideId: string,
    adminUser: { email?: string } | undefined,
    dto: AddCommentDto,
  ): Promise<GuideResponseDto> {
    const adminId = await this.getUserId(adminUser);

    const guide = await this.findAccessibleGuide({
      guideId,
      userId: adminId,
      isAdmin: true,
    });

    await this.guideModel.findByIdAndUpdate(guide._id, {
      $push: {
        comments: {
          text: dto.text,
          adminId,
          timestamp: new Date(),
        },
      },
    });

    const updated = await this.guideModel.findById(guide._id);
    return this.formatGuideResponse(updated!);
  }

  /**
   * Updates a guide's status manually (admin only).
   */
  async updateGuideStatus(
    guideId: string,
    adminUser: { email?: string } | undefined,
    dto: UpdateGuideStatusDto,
  ): Promise<GuideResponseDto> {
    await this.getUserId(adminUser);

    const guide = await this.findAccessibleGuide({ guideId, isAdmin: true });

    await this.guideModel.findByIdAndUpdate(guide._id, {
      $set: { status: dto.status },
    });

    const updated = await this.guideModel.findById(guide._id);
    return this.formatGuideResponse(updated!);
  }

  /**
   * Soft deletes a guide (sets deletedAt, deletedBy).
   */
  async softDeleteGuide(
    guideId: string,
    user: { email?: string } | undefined,
  ): Promise<GuideResponseDto> {
    const userId = await this.getUserId(user);
    const guide = await this.findAccessibleGuide({
      guideId,
      userId,
      isAdmin: false,
    });

    await this.guideModel.findByIdAndUpdate(guide._id, {
      $set: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    const updated = await this.guideModel.findById(guide._id);
    return this.formatGuideResponse(updated!);
  }

  /**
   * Permanently deletes a guide (admin only).
   */
  async hardDeleteGuide(
    guideId: string,
    adminUser: { email?: string } | undefined,
  ): Promise<void> {
    await this.getUserId(adminUser);
    const guide = await this.findAccessibleGuide({ guideId, isAdmin: true });

    await this.guideModel.findByIdAndDelete(guide._id);
  }

  private async fetchProviderStatus(
    provider: string,
    trackingNumber: string,
  ): Promise<string> {
    try {
      switch (provider) {
        case 'GE':
          return await this.fetchGEStatus(trackingNumber);
        case 'TONE':
          return 'unsupported';
        case 'Pkk':
          return 'unsupported';
        case 'Mn':
          return 'unsupported';
        default:
          return 'unknown';
      }
    } catch {
      return 'sync-error';
    }
  }

  private async fetchGEStatus(trackingNumber: string): Promise<string> {
    const guides = await this.guiaEnviaService.getGuides();
    const found = guides.find((g: any) => g.trackingNumber === trackingNumber);
    return found?.status || 'not-found';
  }

  /**
   * Resolves a user email to their MongoDB ObjectId.
   * Throws GDE-AUTH-001 if user is not authenticated or not found.
   */
  private async getUserId(
    user: { email?: string } | undefined,
  ): Promise<Types.ObjectId> {
    if (!user?.email) {
      throw new KraftError(
        CONST.GDE_AUTH_001,
        CONST.MSG_USER_NOT_AUTHENTICATED,
      );
    }
    const dbUser = await this.usersService.findByEmail(user.email);
    if (!dbUser) {
      throw new KraftError(CONST.GDE_AUTH_001, CONST.MSG_USER_NOT_FOUND);
    }
    return dbUser._id;
  }

  private buildBaseQuery(
    filters: GetGuidesQueryDto,
  ): FilterQuery<GuideDoc> & Record<string, unknown> {
    const query: FilterQuery<GuideDoc> & Record<string, unknown> = {
      deletedAt: null,
    };

    if (filters.status) query.status = filters.status;
    if (filters.provider) query.provider = filters.provider;
    if (filters.trackingNumber) {
      query.$or = [
        { kraftId: new RegExp(filters.trackingNumber, 'i') },
        { externalId: new RegExp(filters.trackingNumber, 'i') },
      ];
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate)
        (query.createdAt as Record<string, Date>).$gte = filters.startDate;
      if (filters.endDate)
        (query.createdAt as Record<string, Date>).$lte = filters.endDate;
    }

    return query;
  }

  private async executePaginatedQuery(
    query: FilterQuery<GuideDoc>,
    filters: GetGuidesQueryDto,
  ): Promise<PaginatedGuidesResponseDto> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [guides, total] = await Promise.all([
      this.guideModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.guideModel.countDocuments(query),
    ]);

    return {
      version: this.configService.version || '1.0.0',
      message: null,
      error: null,
      data: {
        guides: guides.map(
          (g) => this.formatGuideResponse(g as unknown as GuideDoc).data,
        ),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Finds a guide by kraftId or ObjectId.
   * Non-admin users can only access their own guides.
   */
  private async findAccessibleGuide({
    guideId,
    userId = null,
    isAdmin = false,
  }: {
    guideId: string;
    userId?: Types.ObjectId | null;
    isAdmin?: boolean;
  }): Promise<GuideDoc> {
    const query: FilterQuery<GuideDoc> & Record<string, unknown> = {
      deletedAt: null,
    };

    if (Types.ObjectId.isValid(guideId)) {
      query.$or = [{ _id: new Types.ObjectId(guideId) }, { kraftId: guideId }];
    } else {
      query.kraftId = guideId;
    }

    if (!isAdmin && userId) {
      query.userId = userId;
    }

    const guide = await this.guideModel.findOne(query);
    if (!guide) {
      throw new KraftError(CONST.GDE_NF_001, CONST.MSG_GUIDE_NOT_FOUND);
    }
    return guide;
  }

  async generateKraftId(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      const counter = await this.kraftIdCounterModel.findOneAndUpdate(
        { yearMonth },
        { $inc: { sequence: 1 }, $set: { updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const sequence = counter.sequence.toString().padStart(6, '0');
      return `KFT-${yearMonth}-${sequence}`;
    } catch (error) {
      throw new KraftError(
        CONST.GDE_BDN_008,
        CONST.MSG_FAILED_GENERATE_KRAFT_ID,
        error,
      );
    }
  }

  /**
   * Calls the appropriate provider API to create a guide.
   * Returns success/failure result with tracking info or error details.
   */
  private async callProviderApi(
    payload: CreateGuideDto,
  ): Promise<ProviderResult> {
    try {
      const response = await this.routeToProvider(payload);
      const guide = response.data.guide;

      if (!guide?.trackingNumber) {
        return {
          success: false,
          error: CONST.MSG_PROVIDER_RETURNED_EMPTY,
          errorCode: CONST.GDE_PVR_002,
        };
      }

      return {
        success: true,
        externalId: guide.trackingNumber,
        labelUrl: guide.labelUrl || guide.guideLink || undefined,
        guide,
      };
    } catch (error) {
      if (error instanceof KraftError) throw error;
      return this.buildProviderErrorResult(error);
    }
  }

  /**
   * Converts a thrown error from a provider into a failure ProviderResult.
   * Extracts structured response data (axios or Nest HttpException) so the
   * client can see what went wrong (e.g. { errors: { reason: '...' } }).
   */
  private buildProviderErrorResult(error: unknown): ProviderResult {
    const responseData = this.extractProviderResponseData(error);
    const errorDetails = this.formatErrorDetails(error, responseData);

    return {
      success: false,
      error: errorDetails,
      errorCode: this.mapProviderErrorToKraftCode(error),
      response: responseData ?? this.fallbackResponse(error),
    };
  }

  /**
   * Pulls the structured payload from an axios error (response.data) or
   * a Nest HttpException (getResponse()). Returns null if neither applies.
   */
  private extractProviderResponseData(
    error: unknown,
  ): Record<string, unknown> | null {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      return this.asObject(data);
    }

    if (this.isHttpExceptionWithObject(error)) {
      return error.getResponse() as Record<string, unknown>;
    }

    return null;
  }

  /**
   * Builds a human-readable error string. Prefers the provider's structured
   * `errors` object (e.g. { reason: 'Rate request already has a label' })
   * over the generic exception message.
   */
  private formatErrorDetails(
    error: unknown,
    responseData: Record<string, unknown> | null,
  ): string {
    if (responseData?.errors) {
      return JSON.stringify(responseData.errors);
    }
    if (typeof responseData?.message === 'string') {
      return responseData.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return CONST.MSG_PROVIDER_ERROR;
  }

  /**
   * Last-resort response payload when the error has no structured data
   * (e.g. plain Error or unknown throw).
   */
  private fallbackResponse(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return { message: error.message };
    }
    return {};
  }

  /**
   * Type guard for Nest HttpException (or subclass) carrying an object body.
   */
  private isHttpExceptionWithObject(
    error: unknown,
  ): error is Error & { getResponse: () => unknown } {
    return (
      error instanceof Error &&
      'getResponse' in error &&
      typeof (error as { getResponse?: unknown }).getResponse === 'function'
    );
  }

  /**
   * Narrows an unknown value to a plain object record, or null.
   */
  private asObject(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : null;
  }

  private async routeToProvider(payload: CreateGuideDto) {
    switch (payload.provider) {
      case 'GE':
        return this.guiaEnviaService.createGuideStandardized(payload);
      case 'TONE':
        return this.t1Service.createGuideStandardized(payload);
      case 'Pkk':
        return this.pakkeService.createGuideStandardized(payload);
      case 'Mn':
        return this.manuableService.createGuideStandardized(payload);
      default:
        throw new KraftError(CONST.GDE_BUS_007, CONST.MSG_INVALID_PROVIDER);
    }
  }

  private mapProviderErrorToKraftCode(error: unknown): string {
    const err = error as {
      code?: string;
      message?: string;
      response?: {
        status?: number;
        data?: { errors?: Record<string, unknown> };
      };
    };
    if (err.code === 'ENOTFOUND') return CONST.GDE_NET_001;
    if (err.code === 'ETIMEDOUT') return CONST.GDE_TMOT_001;
    if (err.message?.includes('rate limit')) return CONST.GDE_RLIM_003;
    if (err.response?.status === 401) return CONST.GDE_PVR_003;
    if (err.response?.status === 400 && err.response?.data?.errors)
      return CONST.GDE_PVR_005;
    if (err.response?.status && err.response.status >= 500)
      return CONST.GDE_PVR_004;
    return CONST.GDE_PVR_001;
  }

  formatGuideResponse(
    guide: GuideDoc,
    providerResult?: ProviderResult,
  ): GuideResponseDto {
    const providerGuide = providerResult?.guide;
    const hasProviderGuide = providerResult?.success && !!providerGuide;

    const data = {
      kraftId: guide.kraftId,
      externalId: guide.externalId || null,
      shipmentNumber: providerGuide?.shipmentNumber ?? null,
      status: guide.status,
      provider: guide.provider as ProviderSource,
      source: hasProviderGuide
        ? providerGuide.source
        : (guide.provider as ProviderSource),
      carrier: providerGuide?.carrier ?? null,
      price: providerGuide?.price ?? null,
      guideLink: providerGuide?.guideLink ?? guide.labelUrl ?? null,
      isProviderTrackingSynced: guide.isProviderTrackingSynced,
      labelUrl: providerGuide?.labelUrl || guide.labelUrl || null,
      file: providerGuide?.file ?? null,
      createdAt: guide.createdAt,
      updatedAt: guide.updatedAt,
      failureInfo: guide.failureInfo
        ? {
            errorDetails: guide.failureInfo.errorDetails,
            errorCode: guide.failureInfo.errorCode,
            timestamp: guide.failureInfo.timestamp,
          }
        : null,
    };

    return {
      version: this.configService.version || '1.0.0',
      message: null,
      error: null,
      data,
    };
  }
}
