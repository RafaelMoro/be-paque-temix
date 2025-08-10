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
    // Ensure the user possesses ALL required roles
    const userRoles = Array.isArray(user.role)
      ? user.role
      : user.role
        ? [user.role]
        : [];
    const hasAllRequiredRoles = requiredRoles.every((role) =>
      userRoles.includes(role),
    );
    return hasAllRequiredRoles;
  }
}
