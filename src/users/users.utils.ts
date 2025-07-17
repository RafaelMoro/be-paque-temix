import { JwtService } from '@nestjs/jwt';
import { UserDoc } from './entities/users.entity';
import { PayloadTokenForgotPwd } from './users.interface';

export const generateJWT = (user: UserDoc, jwtService: JwtService) => {
  const mongoId = user._id;
  const payload: PayloadTokenForgotPwd = { sub: mongoId as string };
  return jwtService.sign(payload);
};
