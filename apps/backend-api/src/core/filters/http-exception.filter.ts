import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

export interface ErrorResponseBody {
  success: false;
  message: string;
  code: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const response =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;
    let messageStr: string;
    if (typeof response === 'string') {
      messageStr = response;
    } else if (response && typeof response === 'object') {
      const m = (response as { message?: string | string[] }).message;
      messageStr = Array.isArray(m) ? m.join('; ') : (m ?? String(exception));
    } else {
      messageStr = String(exception);
    }

    if (status >= 500) {
      this.logger.error(messageStr, exception instanceof Error ? exception.stack : undefined);
    }

    const body: ErrorResponseBody = {
      success: false,
      message: messageStr,
      code: status,
    };

    reply.status(status).send(body);
  }
}
