import { Module } from '@nestjs/common';
import { AddressesService } from './services/addresses.service';
import { AddressesController } from './controllers/addresses.controller';

@Module({
  providers: [AddressesService],
  controllers: [AddressesController],
})
export class AddressesModule {}
