import { Role } from '@/users/users.interface';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import config from '@/config';
import { User } from '@/users/entities/users.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      this.configService.auth.roleKey,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;
    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;
    const hasRequiredRole = requiredRoles.some(
      (role) => user.role?.[0] === role,
    );
    return hasRequiredRole;
  }
}
