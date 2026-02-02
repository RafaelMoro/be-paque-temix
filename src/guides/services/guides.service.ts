import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GuidesService {
  constructor(private guiaEnviaService: GuiaEnviaService) {}

  async getGuides() {
    const [GEGuide] = await Promise.allSettled([
      this.guiaEnviaService.getGuides(),
    ]);
    return {
      guide: 'Sample guide',
    };
  }
}
