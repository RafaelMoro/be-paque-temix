import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GuidesService {
  constructor(private guiaEnviaService: GuiaEnviaService) {}

  getGuides() {
    return {
      guide: 'Sample guide',
    };
  }
}
