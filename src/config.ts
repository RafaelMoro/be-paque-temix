import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  const { CLUSTER, MONGO_DB_NAME, MONGO_USER, MONGO_PWD, MONGO_CONNECTION } =
    process.env;

  return {
    database: {
      cluster: CLUSTER,
      mongoDbName: MONGO_DB_NAME,
      user: MONGO_USER,
      password: MONGO_PWD,
      connection: MONGO_CONNECTION,
    },
  };
});
