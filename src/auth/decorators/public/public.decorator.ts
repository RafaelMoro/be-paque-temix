import { SetMetadata } from '@nestjs/common';

process.loadEnvFile();
const publicKey = process.env.PUBLIC_KEY;
export const Public = (...args: string[]) => SetMetadata(publicKey, args);
