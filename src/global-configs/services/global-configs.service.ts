import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  GlobalConfigs,
  GlobalConfigsDoc,
} from '../entities/global-configs.entity';
import {
  CreateGlobalConfigsDto,
  UpdateGlobalConfigsDto,
} from '../dtos/global-configs.dto';
import config from '@/config';
import { ConfigType } from '@nestjs/config';
import {
  ProfitMarginResponse,
  TypeProfitMargin,
} from '../global-configs.interface';

@Injectable()
export class GlobalConfigsService {
  private globalConfig!: GlobalConfigsDoc;

  constructor(
    @InjectModel(GlobalConfigs.name)
    private globalConfigModel: Model<GlobalConfigs>,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async onModuleInit() {
    await this.ensureConfigExists();
  }

  private async ensureConfigExists(): Promise<void> {
    // Try to find existing global config
    const found: GlobalConfigsDoc | null = await this.globalConfigModel
      .findOne({ configId: 'global' })
      .exec();

    if (!found) {
      // If not found, create a default one and store it
      const defaultConfig: GlobalConfigsDoc = new this.globalConfigModel({
        configId: 'global',
        providers: [],
      });
      this.globalConfig = await defaultConfig.save();
      return;
    }

    // Assign the found document
    this.globalConfig = found;
  }

  async getConfig() {
    try {
      if (!this.globalConfig) {
        await this.ensureConfigExists();
      }
      return this.globalConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async updateConfig(
    configUpdates: Partial<GlobalConfigs>,
  ): Promise<GlobalConfigs> {
    try {
      // Never allow changing the configId to preserve singleton nature
      delete configUpdates.configId;
      const updated = await this.globalConfigModel
        .findOneAndUpdate(
          { configId: 'global' },
          { $set: configUpdates },
          { new: true, upsert: true },
        )
        .exec();
      if (!updated) {
        // Upsert:true should prevent this, but keep a runtime guard for type safety
        throw new BadRequestException('Failed to update global config');
      }

      this.globalConfig = updated;
      return this.globalConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  validateTypeMargin(type: string): void {
    const validTypes: TypeProfitMargin[] = ['percentage', 'absolute'];
    if (!validTypes.includes(type as TypeProfitMargin)) {
      throw new BadRequestException(
        `Invalid type: ${type}. Type must be either 'percentage' or 'absolute'`,
      );
    }
  }

  async getProfitMargin() {
    try {
      const config = await this.getConfig();
      if (!config) {
        throw new NotFoundException('Global config not found');
      }

      const { providers } = config;
      const npmVersion: string = this.configService.version!;
      const response: ProfitMarginResponse = {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          providers,
        },
      };
      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException as-is
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  /**
   * This service is to update the profit margin
   */
  async manageProfitMargin(payload: CreateGlobalConfigsDto) {
    try {
      const config = await this.getConfig();
      const npmVersion: string = this.configService.version!;

      // TODO: change payloads and DTO
      // const editPayload: UpdateGlobalConfigsDto = {
      //   ...payload,
      //   profitMarginId: profitMargin._id as string,
      // };

      // TODO: Verify and validate the type of margin before updating
      // await this.updateProfitMargin(editPayload);
      // const value = payload.profitMargin.value;
      // const type = payload.profitMargin.type;
      // if (!value || !type) {
      //   return new BadRequestException('Could not update profit margin');
      // }
      // this.validateTypeMargin(type);

      // const response: ProfitMarginResponse = {
      //   version: npmVersion,
      //   message: 'Profit margin updated',
      //   error: null,
      //   data: {
      //     profitMargin: {
      //       value,
      //       type,
      //     },
      //   },
      // };
      // return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
