import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import config from '@/config';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { GetGuidesDataResponse } from '../guides.interface';
import { T1Service } from '@/t1/services/t1.service';
import { T1_USER_NOT_FOUND_ERROR, T1_RETRY_GUIDES } from '@/t1/t1.constants';
import { PakkeService } from '@/pakke/services/pakke.service';

@Injectable()
export class GuidesService {
  constructor(
    private guiaEnviaService: GuiaEnviaService,
    private toneService: T1Service,
    private pakkeService: PakkeService,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getGuides(): Promise<GetGuidesDataResponse> {
    const npmVersion: string = this.configService.version!;
    const messages: string[] = [];
    const [GEGuidesResponse, T1GuidesResponse, PkkGuidesResponse] =
      await Promise.allSettled([
        this.guiaEnviaService.getGuides(),
        this.toneService.retrieveT1Guides(),
        this.pakkeService.getBasicGuidesInfoPkk({
          pageNumber: 1,
          pageSize: 30,
        }),
      ]);

    const geGuidesData =
      GEGuidesResponse.status === 'fulfilled' ? GEGuidesResponse.value : [];
    const t1GuidesData =
      T1GuidesResponse.status === 'fulfilled'
        ? (T1GuidesResponse.value.data ?? [])
        : [];
    const pkkGuidesData =
      PkkGuidesResponse.status === 'fulfilled' ? PkkGuidesResponse.value : [];

    // Handle rejected promises
    if (GEGuidesResponse.status === 'rejected') {
      messages.push('GE failed to get guides');
      messages.push(`GE Error: ${(GEGuidesResponse.reason as Error).message}`);
    }
    if (T1GuidesResponse.status === 'rejected') {
      messages.push('T1 failed to get guides');
      // Check if error message contains the specific T1 user not found error
      const errorMessage = (T1GuidesResponse.reason as Error).message;
      if (errorMessage.includes(T1_USER_NOT_FOUND_ERROR)) {
        messages.push(T1_RETRY_GUIDES);
      }
    }
    if (PkkGuidesResponse.status === 'rejected') {
      messages.push('Pkk failed to get guides');
    }

    // Handle fulfilled cases with messages
    if (
      T1GuidesResponse.status === 'fulfilled' &&
      T1GuidesResponse.value.messages
    ) {
      messages.push(...T1GuidesResponse.value.messages);
    }

    const allGuides = [...geGuidesData, ...t1GuidesData, ...pkkGuidesData];
    return {
      version: npmVersion,
      message: messages.length > 0 ? messages[0] : null,
      messages: messages,
      error: null,
      data: {
        guides: allGuides,
      },
    };
  }
}
