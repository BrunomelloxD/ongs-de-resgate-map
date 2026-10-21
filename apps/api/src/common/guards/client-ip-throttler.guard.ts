import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getClientIp } from '@/common/http/client-ip.js';

/** Every request reaches the api through the web, so the limit is per visitor. */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(
    req: Parameters<typeof getClientIp>[0],
  ): Promise<string> {
    return Promise.resolve(getClientIp(req));
  }
}
