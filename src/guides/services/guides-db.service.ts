import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guide, GuideDoc } from '../entities/guide.entity';
import { KraftIdCounter } from '../entities/kraft-id-counter.entity';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { T1Service } from '@/t1/services/t1.service';
import { PakkeService } from '@/pakke/services/pakke.service';
import { ManuableService } from '@/manuable/services/manuable.service';

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
  ) {}

  async generateKraftId(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const counter = await this.kraftIdCounterModel.findOneAndUpdate(
      { yearMonth },
      { $inc: { sequence: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const sequence = counter.sequence.toString().padStart(6, '0');
    return `KFT-${yearMonth}-${sequence}`;
  }
}
