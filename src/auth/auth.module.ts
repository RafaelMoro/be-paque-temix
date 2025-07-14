import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '@/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import config from '@/config';
import { JWT_EXPIRE_TIME } from './auth.constant';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (
        configServices: ConfigType<typeof config>,
      ): JwtModuleOptions => {
        return {
          secret: configServices.auth.jwtKey ?? '',
          signOptions: {
            expiresIn: JWT_EXPIRE_TIME,
          },
        };
      },

      inject: [config.KEY],
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
