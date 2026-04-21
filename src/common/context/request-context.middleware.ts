import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const academicStart = req.headers['x-academic-start'] as string;
    const academicEnd = req.headers['x-academic-end'] as string;
    const academicId = req.headers['x-academic-id'] as string;

    const contextStore = {
      academicStart: academicStart ? new Date(academicStart) : undefined,
      academicEnd: academicEnd ? new Date(academicEnd) : undefined,
      academicId: academicId ? parseInt(academicId, 10) : undefined,
    };

    RequestContextService.run(contextStore, next);
  }
}
