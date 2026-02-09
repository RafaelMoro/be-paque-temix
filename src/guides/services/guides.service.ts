import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import config from '@/config';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { GetQuoteDataResponse } from '../guides.interface';

@Injectable()
export class GuidesService {
  constructor(
    private guiaEnviaService: GuiaEnviaService,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getGuides(): Promise<GetQuoteDataResponse> {
    const npmVersion: string = this.configService.version!;
    const [GEGuide] = await Promise.allSettled([
      this.guiaEnviaService.getGuides(),
    ]);

    const geQuotesData = GEGuide.status === 'fulfilled' ? GEGuide.value : [];

    const allGuides = [...geQuotesData];
    return {
      version: npmVersion,
      message: null,
      messages: [],
      error: null,
      data: {
        guides: allGuides,
      },
    };
  }
}
