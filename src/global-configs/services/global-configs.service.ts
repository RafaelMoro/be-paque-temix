import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  GlobalConfigs,
  GlobalConfigsDoc,
} from '../entities/global-configs.entity';
import { CreateGlobalConfigsDto } from '../dtos/global-configs.dto';

@Injectable()
export class GlobalConfigsService {
  constructor(
    @InjectModel(GlobalConfigs.name)
    private globalConfigModel: Model<GlobalConfigs>,
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
      const profitMarginArray = await this.globalConfigModel.find().exec();
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
}
