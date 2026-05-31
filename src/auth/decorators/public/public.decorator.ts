import { SetMetadata } from '@nestjs/common';

export const Public = (...args: string[]) =>
  SetMetadata(process.env.PUBLIC_KEY!, args);
