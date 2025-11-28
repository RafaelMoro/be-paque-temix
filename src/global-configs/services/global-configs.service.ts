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
import {
  UpdateGlobalMarginProfitDto,
  UpdateProvidersMarginProfitDto,
} from '../dtos/global-configs.dto';
import config from '@/config';
import {
  GlobalProfitMarginResponse,
  ProfitMarginResponse,
  TypeProfitMargin,
} from '../global-configs.interface';
import { QuoteCourier, ProviderSource } from '@/quotes/quotes.interface';
import { QUOTE_COURIER, QUOTE_SOURCE } from '@/quotes/quotes.constants';
import { PROFIT_MARGIN_TYPE } from '../global-configs.constants';

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
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
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

  async updateProvidersConfig(payload: UpdateProvidersMarginProfitDto) {
    try {
      const updated = await this.globalConfigModel
        .findOneAndUpdate(
          { configId: 'global' },
          { $set: { providers: payload.providers } },
          { new: true },
        )
        .exec();
      if (!updated) {
        throw new BadRequestException('Failed to update providers config');
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

  async updateGlobalMarginProfitConfig(payload: UpdateGlobalMarginProfitDto) {
    try {
      const updated = await this.globalConfigModel
        .findOneAndUpdate(
          { configId: 'global' },
          { $set: { globalMarginProfit: payload.globalMarginProfit } },
          { new: true },
        )
        .exec();
      if (!updated) {
        throw new BadRequestException('Failed to update global profit margin');
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
    const validTypes: TypeProfitMargin[] = [...PROFIT_MARGIN_TYPE];
    if (!validTypes.includes(type as TypeProfitMargin)) {
      throw new BadRequestException(
        `Invalid type: ${type}. Type must be either 'percentage' or 'absolute'`,
      );
    }
  }

  validateProvider(provider: string): void {
    const validProviders: ProviderSource[] = [...QUOTE_SOURCE];
    if (!validProviders.includes(provider as ProviderSource)) {
      throw new BadRequestException(
        `Invalid provider: ${provider}. Provider must be one of: ${validProviders.join(', ')}`,
      );
    }
  }

  validateCourier(courier: string): void {
    const validCouriers: QuoteCourier[] = [...QUOTE_COURIER];
    if (!validCouriers.includes(courier as QuoteCourier)) {
      throw new BadRequestException(
        `Invalid courier: ${courier}. Courier must be one of: ${validCouriers.join(', ')}`,
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

  async manageGlobalProfitMargin(payload: UpdateGlobalMarginProfitDto) {
    try {
      // Validate the type is correct
      this.validateTypeMargin(payload.globalMarginProfit.type);

      const npmVersion: string = this.configService.version!;
      const config = await this.updateGlobalMarginProfitConfig(payload);
      const { globalMarginProfit } = config;

      const response: GlobalProfitMarginResponse = {
        version: npmVersion,
        message: 'Global profit margin updated',
        error: null,
        data: {
          globalMarginProfit,
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

  /**
   * This service is to update the profit margin
   */
  async updateProvidersProfitMargin(payload: UpdateProvidersMarginProfitDto) {
    try {
      // Validate the type of each courier's profit margin
      payload.providers?.forEach((provider) => {
        this.validateProvider(provider.name);
        provider.couriers.forEach((courier) => {
          this.validateCourier(courier.name);
          this.validateTypeMargin(courier.profitMargin.type);
        });
      });
      const npmVersion: string = this.configService.version!;

      const config = await this.updateProvidersConfig(payload);
      const { providers } = config;

      const response: ProfitMarginResponse = {
        version: npmVersion,
        message: "Provider's profit margin updated",
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
