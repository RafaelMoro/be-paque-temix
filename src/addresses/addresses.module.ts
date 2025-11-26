import { Module } from '@nestjs/common';
import { AddressesService } from './services/addresses.service';
import { AddressesController } from './controllers/addresses.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressDoc, AddressSchema } from './entities/addresses.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AddressDoc.name,
        schema: AddressSchema,
      },
    ]),
  ],
  providers: [AddressesService],
  controllers: [AddressesController],
})
export class AddressesModule {}
