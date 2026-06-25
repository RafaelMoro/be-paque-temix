import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { Guide, GuideDoc } from '../entities/guide.entity';
import { KraftIdCounter } from '../entities/kraft-id-counter.entity';
import { CreateGuideDto } from '../dtos/guides-db.dto';
import { GuideResponseDto } from '../dtos/guides-db-responses.dto';
import { ProviderResult } from '../guides.interface';
import { KraftError } from '../kraft-error';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { T1Service } from '@/t1/services/t1.service';
import { PakkeService } from '@/pakke/services/pakke.service';
import { ManuableService } from '@/manuable/services/manuable.service';
import { UsersService } from '@/users/services/users.service';
import config from '@/config';

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
        throw new KraftError('GDE-AUTH-001', 'User not authenticated');
      }

      const dbUser = await this.usersService.findByEmail(user.email);
      if (!dbUser) {
        throw new KraftError('GDE-AUTH-001', 'User not found');
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
              errorDetails: providerResult.error || 'Provider error',
              errorCode: providerResult.errorCode || 'GDE-PVR-001',
              providerResponse: providerResult.response || {},
              timestamp: new Date(),
            },
        retries: { retryAttempts: [], retryCount: 0 },
        comments: [],
      });

      return this.formatGuideResponse(guide);
    } catch (error) {
      if (error instanceof KraftError) throw error;
      throw new KraftError('GDE-BDN-001', 'Failed to create guide', error);
    }
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
      throw new KraftError('GDE-BDN-008', 'Failed to generate kraftId', error);
    }
  }

  private async callProviderApi(
    payload: CreateGuideDto,
  ): Promise<ProviderResult> {
    try {
      const response = await this.routeToProvider(payload);
      const guide = response.data.guide;

      if (!guide?.trackingNumber) {
        return {
          success: false,
          error: 'Provider returned empty guide',
          errorCode: 'GDE-PVR-002',
        };
      }

      return {
        success: true,
        externalId: guide.trackingNumber,
        labelUrl: guide.labelUrl || guide.guideLink || undefined,
      };
    } catch (error) {
      if (error instanceof KraftError) throw error;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Provider error',
        errorCode: this.mapProviderErrorToKraftCode(error),
        response:
          error instanceof Error
            ? { message: error.message }
            : {},
      };
    }
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
        throw new KraftError('GDE-BUS-007', 'Invalid provider specified');
    }
  }

  private mapProviderErrorToKraftCode(error: unknown): string {
    const err = error as {
      code?: string;
      message?: string;
      response?: { status?: number };
    };
    if (err.code === 'ENOTFOUND') return 'GDE-NET-001';
    if (err.code === 'ETIMEDOUT') return 'GDE-TMOT-001';
    if (err.message?.includes('rate limit')) return 'GDE-RLIM-003';
    if (err.response?.status === 401) return 'GDE-PVR-003';
    if (err.response?.status && err.response.status >= 500) return 'GDE-PVR-004';
    return 'GDE-PVR-001';
  }

  formatGuideResponse(guide: GuideDoc): GuideResponseDto {
    const data = {
      kraftId: guide.kraftId,
      externalId: guide.externalId || undefined,
      status: guide.status,
      provider: guide.provider,
      isProviderTrackingSynced: guide.isProviderTrackingSynced,
      labelUrl: guide.labelUrl || undefined,
      createdAt: guide.createdAt,
      updatedAt: guide.updatedAt,
      failureInfo: guide.failureInfo
        ? {
            errorDetails: guide.failureInfo.errorDetails,
            errorCode: guide.failureInfo.errorCode,
            timestamp: guide.failureInfo.timestamp,
          }
        : undefined,
    };

    return {
      version: this.configService.version || '1.0.0',
      message: null,
      error: null,
      data,
    };
  }
}
