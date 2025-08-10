import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigType } from '@nestjs/config';
import config from '../config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigType<typeof config>) => {
        const { connection, user, password, cluster, mongoDbName } =
          configService.database;
        return {
          uri: `${connection}://${user}:${password}@${cluster}.pn7vylk.mongodb.net/?retryWrites=true&w=majority`,
          user,
          pass: password,
          dbName: mongoDbName,
        };
      },
      inject: [config.KEY],
    }),
  ],
})
export class DatabaseModule {}
