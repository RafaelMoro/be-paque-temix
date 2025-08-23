import { Controller } from '@nestjs/common';
import { GlobalConfigsService } from '../services/global-configs.service';

@Controller('global-configs')
export class GlobalConfigsController {
  constructor(private readonly globalConfigsService: GlobalConfigsService) {}
}
