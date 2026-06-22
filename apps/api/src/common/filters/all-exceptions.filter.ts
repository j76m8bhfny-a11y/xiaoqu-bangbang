import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let code = 50001;
    let message = '服务端错误';
    let status = 500;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, unknown>;
        code = (obj.code as number) ?? status * 100 + 1;
        message = (obj.message as string) ?? exception.message;
      } else {
        message = exception.message;
        code = status * 100 + 1;
      }
    } else if (exception instanceof Error) {
      console.error('[AllExceptionsFilter]', exception.stack || exception.message);
    }

    response.status(status).json({ code, message, data: null });
  }
}
