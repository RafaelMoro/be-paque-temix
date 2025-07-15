import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UsersSchema } from './entities/users.entity';
import { MailModule } from '@/mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import config from '@/config';
import { JWT_ONE_TIME_EXPIRE_TIME } from '@/auth/auth.constant';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UsersSchema,
      },
    ]),
    JwtModule.registerAsync({
      useFactory: (configServices: ConfigType<typeof config>) => {
        return {
          secret: configServices.auth.oneTimeJwtKey,
          signOptions: {
            expiresIn: JWT_ONE_TIME_EXPIRE_TIME,
          },
        };
      },
      inject: [config.KEY],
    }),
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
