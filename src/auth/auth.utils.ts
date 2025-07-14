import { JwtService } from '@nestjs/jwt';
import { GenerateJWTUser, PayloadToken } from './auth.interface';

export const generateJWT = (user: GenerateJWTUser, jwtService: JwtService) => {
  const payload: PayloadToken = {
    email: user.email,
    name: user.name,
    lastName: user.lastName,
    role: user.role,
  };
  return jwtService.sign(payload);
};
