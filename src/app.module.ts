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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggedMiddleware).forRoutes('*');
  }
}
