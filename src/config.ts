import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  const {
    CLUSTER,
    MONGO_DB_NAME,
    MONGO_USER,
    MONGO_PWD,
    MONGO_CONNECTION,
    JWT_KEY,
    ONE_TIME_JWT_KEY,
    PUBLIC_KEY,
    ROLE_KEY,
    FRONTEND_PORT,
    FRONTEND_URI,
    NODE_ENV,
    npm_package_version: npmVersion,
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
      oneTimeJwtKey: ONE_TIME_JWT_KEY,
    },
    frontend: {
      port: FRONTEND_PORT,
      uri: FRONTEND_URI,
    },
    environment: NODE_ENV,
    version: npmVersion,
  };
});
