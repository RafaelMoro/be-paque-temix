import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeleteResult, Model } from 'mongoose';

import {
  GeneralInfoDb,
  GeneralInfoDbDoc,
} from '../entities/general-info-db.entity';
import { UpdateGeneralInfoDbDto } from '../dtos/general-info-db.dto';

@Injectable()
export class GeneralInfoDbService {
  constructor(
    @InjectModel(GeneralInfoDb.name)
    private generalInfoDbModel: Model<GeneralInfoDb>,
  ) {}

  async createMnTk(tk: string) {
    try {
      const newMbTk = new this.generalInfoDbModel({ mnTk: tk });
      const modelSaved: GeneralInfoDbDoc = await newMbTk.save();
      return modelSaved;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async getMnTk() {
    try {
      const mnTk = await this.generalInfoDbModel.find().exec();
      if (mnTk.length === 0) {
        return null;
      }
      const [token] = mnTk;
      return token;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async updateMbTk({ changes }: { changes: UpdateGeneralInfoDbDto }) {
    try {
      const { mnTkId } = changes;
      const updated = await this.generalInfoDbModel
        .findByIdAndUpdate(mnTkId, { $set: changes })
        .exec();
      return updated;
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
