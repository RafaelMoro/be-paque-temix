import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeleteResult, Model } from 'mongoose';

import {
  GeneralInfoDb,
  GeneralInfoDbDoc,
} from '../entities/general-info-db.entity';
import { UpdateMnTokenDto } from '../dtos/general-info-db.dto';

@Injectable()
export class GeneralInfoDbService implements OnModuleInit {
  private generalConfig!: GeneralInfoDbDoc;

  constructor(
    @InjectModel(GeneralInfoDb.name)
    private generalInfoDbModel: Model<GeneralInfoDb>,
  ) {}

  async onModuleInit() {
    await this.ensureConfigExists();
  }

  private async ensureConfigExists(): Promise<void> {
    try {
      // Try to find existing general info config
      const found: GeneralInfoDbDoc | null = await this.generalInfoDbModel
        .findOne({ configId: 'global' })
        .exec();

      if (!found) {
        // If not found, create a default one and store it
        const defaultConfig = new this.generalInfoDbModel({
          configId: 'global',
          mnConfig: {
            tkProd: '',
            tkDev: '',
          },
          toneConfig: {
            tkProd: '',
            tkDev: '',
          },
        });
        this.generalConfig = await defaultConfig.save();
        return;
      }

      // Assign the found document
      this.generalConfig = found;
    } catch (error) {
      console.error(
        'GeneralInfoDbService: Error in ensureConfigExists:',
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
      if (!this.generalConfig) {
        await this.ensureConfigExists();
      }
      return this.generalConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async getMnTk({ isProd }: { isProd: boolean }) {
    try {
      const config = await this.getConfig();
      if (!config) {
        return null;
      }

      // Return the appropriate token based on isProd parameter
      return isProd ? config.mnConfig.tkProd : config.mnConfig.tkDev;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async updateMnToken(payload: UpdateMnTokenDto) {
    try {
      const { token, isProd } = payload;
      const updateField = isProd ? 'mnConfig.tkProd' : 'mnConfig.tkDev';

      const updated = await this.generalInfoDbModel
        .findOneAndUpdate(
          { configId: 'global' },
          { $set: { [updateField]: token } },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new BadRequestException('Failed to update MN token config');
      }

      this.generalConfig = updated;
      return this.generalConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async deleteMbTk(mnTk: string): Promise<DeleteResult | null> {
    try {
      const mnTkDeleted = await this.generalInfoDbModel
        .deleteOne({ mnTk })
        .exec();
      return mnTkDeleted;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
