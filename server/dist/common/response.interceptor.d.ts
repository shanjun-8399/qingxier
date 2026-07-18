import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
export declare class ResponseInterceptor implements NestInterceptor {
    intercept(c: ExecutionContext, n: CallHandler): Observable<unknown>;
}
