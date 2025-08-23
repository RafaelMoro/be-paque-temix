import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GlobalConfigs } from '../entities/global-configs.entity';
import { Model } from 'mongoose';

@Injectable()
export class GlobalConfigsService {
  constructor(
    @InjectModel(GlobalConfigs.name) private userModel: Model<GlobalConfigs>,
  ) {}
}
