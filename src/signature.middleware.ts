// signature.middleware.ts
import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SignatureMiddleware implements NestMiddleware {
  // Add both SHA-1 fingerprints here
  private allowedShas = [
    'B6:E4:B9:C4:1C:9D:2F:7F:24:F9:25:37:FB:A0:E5:C3:F4:DB:F5:0F',
    '38:22:00:03:8F:D6:67:D6:49:FE:33:82:5F:08:8D:DF:79:80:24:15',
  ];

  use(req: Request, res: Response, next: NextFunction) {
    const appSignature = req.headers['x-app-signature'] as string;

    if (!appSignature) {
      throw new ForbiddenException('No app signature provided');
    }

    if (!this.allowedShas.includes(appSignature)) {
      throw new ForbiddenException('App signature not recognized');
    }

    next();
  }
}
