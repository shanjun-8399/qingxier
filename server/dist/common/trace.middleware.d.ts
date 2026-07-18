import { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
export declare class TraceMiddleware implements NestMiddleware {
    use(req: Request & {
        traceId?: string;
    }, res: Response, next: NextFunction): void;
}
