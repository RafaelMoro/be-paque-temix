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
  constructor(
    @InjectModel(GlobalConfigs.name)
    private globalConfigModel: Model<GlobalConfigs>,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async createProfitMargin(payload: CreateGlobalConfigsDto) {
    try {
      const globalConfigModel = await this.globalConfigModel.create(payload);
      const modelSaved: GlobalConfigsDoc = await globalConfigModel.save();
      return modelSaved;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async readProfitMargin() {
    try {
      const profitMarginArray: GlobalConfigsDoc[] = await this.globalConfigModel
        .find()
        .exec();
      if (profitMarginArray.length === 0) {
        return null;
      }
      const [profitMargin] = profitMarginArray;
      return profitMargin;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async updateProfitMargin(changes: UpdateGlobalConfigsDto) {
    try {
      const { profitMarginId } = changes;
      const updated: GlobalConfigsDoc | null = await this.globalConfigModel
        .findByIdAndUpdate(profitMarginId, { $set: changes })
        .exec();
      return updated;
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

  /**
   * This service is to update or create the profit margin
   */
  async manageProfitMargin(payload: CreateGlobalConfigsDto) {
    try {
      const profitMargin = await this.readProfitMargin();
      const npmVersion: string = this.configService.version!;
      // If it does not exist, then create it
      if (!profitMargin) {
        const newProfitMargin = await this.createProfitMargin(payload);
        const {
          profitMargin: { value, type },
        } = newProfitMargin;
        this.validateTypeMargin(type);

        const response: ProfitMarginResponse = {
          version: npmVersion,
          message: 'Profit margin created',
          error: null,
          data: {
            profitMargin: {
              value,
              type,
            },
          },
        };
        return response;
      }

      const editPayload: UpdateGlobalConfigsDto = {
        ...payload,
        profitMarginId: profitMargin._id as string,
      };
      const editedProfitMargin = await this.updateProfitMargin(editPayload);
      const value = editedProfitMargin?.profitMargin.value;
      const type = editedProfitMargin?.profitMargin.type;
      if (!value || !type) {
        return new BadRequestException('Could not update profit margin');
      }
      this.validateTypeMargin(type);

      const response: ProfitMarginResponse = {
        version: npmVersion,
        message: 'Profit margin updated',
        error: null,
        data: {
          profitMargin: {
            value,
            type,
          },
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

  async getProfitMargin() {
    try {
      const profitMargin = await this.readProfitMargin();
      if (!profitMargin) {
        throw new NotFoundException('Profit margin not found');
      }

      const {
        profitMargin: { value, type },
      } = profitMargin;
      const npmVersion: string = this.configService.version!;
      const response: ProfitMarginResponse = {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          profitMargin: {
            value,
            type,
          },
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
}
