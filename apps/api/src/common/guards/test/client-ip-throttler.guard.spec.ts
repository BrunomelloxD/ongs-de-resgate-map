import { Reflector } from '@nestjs/core';
import { ClientIpThrottlerGuard } from '../client-ip-throttler.guard.js';

describe('ClientIpThrottlerGuard', () => {
  const guard = new ClientIpThrottlerGuard(
    { throttlers: [] },
    {} as never,
    new Reflector(),
  );

  it('rastreia a requisição pelo IP do X-Client-IP', async () => {
    const tracker = await guard['getTracker']({
      headers: { 'x-client-ip': '203.0.113.7' },
      ip: '10.0.0.2',
    });

    expect(tracker).toBe('203.0.113.7');
  });

  it('rastreia pelo IP da conexão quando não há X-Client-IP', async () => {
    const tracker = await guard['getTracker']({ headers: {}, ip: '10.0.0.2' });

    expect(tracker).toBe('10.0.0.2');
  });
});
