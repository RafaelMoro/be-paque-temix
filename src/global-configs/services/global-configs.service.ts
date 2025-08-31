import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigType } from '@nestjs/config';

import {
  GlobalConfigs,
  GlobalConfigsDoc,
} from '../entities/global-configs.entity';
import { UpdateGlobalConfigsDto } from '../dtos/global-configs.dto';
import config from '@/config';
import {
  ProfitMarginResponse,
  TypeProfitMargin,
} from '../global-configs.interface';

@Injectable()
export class GlobalConfigsService implements OnModuleInit {
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
    try {
      // Try to find existing global config
      const found: GlobalConfigsDoc | null = await this.globalConfigModel
        .findOne({ configId: 'global' })
        .exec();

      if (!found) {
        // If not found, create a default one and store it
        const defaultConfig = new this.globalConfigModel({
          configId: 'global',
          providers: [],
          globalMarginProfit: {
            value: 0,
            type: 'percentage',
          },
        });
        this.globalConfig = await defaultConfig.save();
        return;
      }

      // Assign the found document
      this.globalConfig = found;
    } catch (error) {
      console.error(
        'GlobalConfigsService: Error in ensureConfigExists:',
        error,
      );
      throw error;
    }
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
    configUpdates: UpdateGlobalConfigsDto,
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
  async updateProvidersProfitMargin(payload: UpdateGlobalConfigsDto) {
    try {
      // Validate the type of each courier's profit margin
      payload.providers?.forEach((provider) => {
        provider.couriers.forEach((courier) => {
          this.validateTypeMargin(courier.profitMargin.type);
        });
      });
      const npmVersion: string = this.configService.version!;

      const config = await this.updateConfig(payload);
      const { providers } = config;

      const response: ProfitMarginResponse = {
        version: npmVersion,
        message: 'Profit margin updated',
        error: null,
        data: {
          providers,
        },
      };
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
