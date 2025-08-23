import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import config from './config';
import { Example, ExampleSchema } from './example.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoggedMiddleware } from './middlewares/LoggedMiddleware.middleware';
import { MailModule } from './mail/mail.module';
import { GuiaEnviaModule } from './guia-envia/guia-envia.module';
import { T1Module } from './t1/t1.module';
import { PakkeModule } from './pakke/pakke.module';
import { ManuableModule } from './manuable/manuable.module';
import { GeneralInfoDbModule } from './general-info-db/general-info-db.module';
import { QuotesModule } from './quotes/quotes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [config],
      isGlobal: true,
      validationSchema: Joi.object({
        CLUSTER: Joi.string().required(),
        MONGO_USER: Joi.string().required(),
        MONGO_PWD: Joi.string().required(),
        MONGO_DB_NAME: Joi.string().required(),
        MONGO_CONNECTION: Joi.string().required(),
        NODE_ENV: Joi.string().required(),
        JWT_KEY: Joi.string().required(),
        ONE_TIME_JWT_KEY: Joi.string().required(),
        PUBLIC_KEY: Joi.string().required(),
        ROLE_KEY: Joi.string().required(),
        FRONTEND_PORT: Joi.string().required(),
        FRONTEND_URI: Joi.string().required(),
        RESEND_API_KEY: Joi.string().required(),
        MAILER_MAIL: Joi.string().email().required(),
        GUIA_ENVIA_KEY: Joi.string().required(),
        GUIA_ENVIA_URI: Joi.string().uri().required(),
        T1_URI: Joi.string().uri().required(),
        T1_KEY: Joi.string().required(),
        T1_STORE_ID: Joi.string().required(),
        PAKKE_KEY: Joi.string().required(),
        PAKKE_URI: Joi.string().uri().required(),
        MANUABLE_EM: Joi.string().email().required(),
        MANUABLE_PSS: Joi.string().required(),
        MANUABLE_URI: Joi.string().uri().required(),
      }),
    }),
    MongooseModule.forFeature([
      {
        name: Example.name,
        schema: ExampleSchema,
      },
    ]),
    DatabaseModule,
    UsersModule,
    AuthModule,
    MailModule,
    GuiaEnviaModule,
    T1Module,
    PakkeModule,
    ManuableModule,
    GeneralInfoDbModule,
    QuotesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggedMiddleware).forRoutes('*');
  }
}
