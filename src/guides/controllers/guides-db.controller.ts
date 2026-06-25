import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { GuidesDbService } from '../services/guides-db.service';

@ApiTags('Guides DB')
@UseGuards(JwtGuard)
@Controller('guides/db')
export class GuidesDbController {
  constructor(private readonly guidesDbService: GuidesDbService) {}
}
