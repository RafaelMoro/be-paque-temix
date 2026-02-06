import { SetMetadata } from '@nestjs/common';

const publicKey = process.env.PUBLIC_KEY;
export const Public = (...args: string[]) => SetMetadata(publicKey, args);
