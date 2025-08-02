import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  GeneralInfoDb,
  GeneralInfoDbDoc,
} from '../entities/general-info-db.entity';

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

  async updateMbTk() {
    try {
      // something
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
