import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import config from '@/config';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { GetQuoteDataResponse } from '../guides.interface';
import { T1Service } from '@/t1/services/t1.service';

@Injectable()
export class GuidesService {
  constructor(
    private guiaEnviaService: GuiaEnviaService,
    private toneService: T1Service,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getGuides(): Promise<GetQuoteDataResponse> {
    const npmVersion: string = this.configService.version!;
    const [GEGuide, T1Guide] = await Promise.allSettled([
      this.guiaEnviaService.getGuides(),
      this.toneService.retrieveT1Guides(),
    ]);

    const geQuotesData = GEGuide.status === 'fulfilled' ? GEGuide.value : [];
    const t1QuotesData =
      T1Guide.status === 'fulfilled' ? (T1Guide.value.data ?? []) : [];
    const t1Messages =
      T1Guide.status === 'fulfilled' ? (T1Guide.value.messages ?? []) : [];

    const allGuides = [...geQuotesData, ...t1QuotesData];
    return {
      version: npmVersion,
      message: null,
      messages: t1Messages,
      error: null,
      data: {
        guides: allGuides,
      },
    };
  }
}
