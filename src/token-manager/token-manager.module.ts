import { Module } from '@nestjs/common';
import { TokenManagerService } from './services/token-manager.service';

@Module({
  providers: [TokenManagerService],
  exports: [TokenManagerService],
})
export class TokenManagerModule {}
