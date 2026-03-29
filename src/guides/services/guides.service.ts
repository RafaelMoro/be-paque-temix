import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import config from '@/config';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { GetQuoteDataResponse } from '../guides.interface';
import { T1Service } from '@/t1/services/t1.service';
import { T1_USER_NOT_FOUND_ERROR, T1_RETRY_GUIDES } from '@/t1/t1.constants';

@Injectable()
export class GuidesService {
  constructor(
    private guiaEnviaService: GuiaEnviaService,
    private toneService: T1Service,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getGuides(): Promise<GetQuoteDataResponse> {
    const npmVersion: string = this.configService.version!;
    const messages: string[] = [];
    const [GEGuide, T1Guide] = await Promise.allSettled([
      this.guiaEnviaService.getGuides(),
      this.toneService.retrieveT1Guides(),
    ]);

    const geQuotesData = GEGuide.status === 'fulfilled' ? GEGuide.value : [];
    const t1QuotesData =
      T1Guide.status === 'fulfilled' ? (T1Guide.value.data ?? []) : [];

    // Handle rejected promises
    if (GEGuide.status === 'rejected') {
      messages.push('GE failed to get guides');
      messages.push(`GE Error: ${(GEGuide.reason as Error).message}`);
    }
    if (T1Guide.status === 'rejected') {
      messages.push('T1 failed to get guides');
      // Check if error message contains the specific T1 user not found error
      const errorMessage = (T1Guide.reason as Error).message;
      if (errorMessage.includes(T1_USER_NOT_FOUND_ERROR)) {
        messages.push(T1_RETRY_GUIDES);
      }
    }

    // Handle fulfilled cases with messages
    if (T1Guide.status === 'fulfilled' && T1Guide.value.messages) {
      messages.push(...T1Guide.value.messages);
    }

    const allGuides = [...geQuotesData, ...t1QuotesData];
    return {
      version: npmVersion,
      message: null,
      messages: messages,
      error: null,
      data: {
        guides: allGuides,
      },
    };
  }
}
