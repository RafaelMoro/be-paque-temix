import { JwtService } from '@nestjs/jwt';
import { UserDoc } from './entities/users.entity';

interface PayloadToken {
  sub: string;
}

export const generateJWT = (user: UserDoc, jwtService: JwtService) => {
  const mongoId = user._id;
  const payload: PayloadToken = { sub: mongoId as string };
  return jwtService.sign(payload);
};
