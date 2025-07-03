import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include cookies with accessToken
declare module 'express' {
  interface Request {
    cookies: {
      accessToken?: string;
    };
  }
}

@Injectable()
export class LoggedMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token: string | undefined = req.cookies.accessToken;
    console.log('cookied', req.cookies);
    if (!token) {
      next();
      return;
    }

    req.headers.authorization = `Bearer ${token}`;
    next();
  }
}
