import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  const {
    CLUSTER,
    MONGO_DB_NAME,
    MONGO_USER,
    MONGO_PWD,
    MONGO_CONNECTION,
    JWT_KEY,
    PUBLIC_KEY,
    ROLE_KEY,
  } = process.env;

  return {
    database: {
      cluster: CLUSTER,
      mongoDbName: MONGO_DB_NAME,
      user: MONGO_USER,
      password: MONGO_PWD,
      connection: MONGO_CONNECTION,
    },
    auth: {
      jwtKey: JWT_KEY,
      publicKey: PUBLIC_KEY,
      roleKey: ROLE_KEY,
    },
  };
});
