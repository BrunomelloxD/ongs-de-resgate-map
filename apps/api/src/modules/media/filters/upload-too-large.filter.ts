import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppConfigService } from '@/common/config/app-config.service.js';

/** Multer's 413 comes in English; DEMO-11 needs "O arquivo passa de {N} MB.". */
@Injectable()
@Catch(PayloadTooLargeException)
export class UploadTooLargeFilter implements ExceptionFilter {
  constructor(private readonly config: AppConfigService) {}

  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const status = HttpStatus.PAYLOAD_TOO_LARGE;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        statusCode: status,
        error: 'Payload Too Large',
        message: `O arquivo passa de ${this.config.demo.maxUploadMb} MB.`,
      });
  }
}
