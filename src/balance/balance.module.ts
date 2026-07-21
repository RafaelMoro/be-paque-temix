import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from '@/mail/mail.module';
import { UsersModule } from '@/users/users.module';
import { BalanceController } from './controllers/balance.controller';
import { Balance, BalanceSchema } from './entities/balance.entity';
import {
  BalanceRequest,
  BalanceRequestSchema,
} from './entities/balance-request.entity';
import { BalanceService } from './services/balance.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Balance.name, schema: BalanceSchema },
      { name: BalanceRequest.name, schema: BalanceRequestSchema },
    ]),
    UsersModule,
    MailModule,
  ],
  providers: [BalanceService],
  controllers: [BalanceController],
  exports: [BalanceService],
})
export class BalanceModule {}
