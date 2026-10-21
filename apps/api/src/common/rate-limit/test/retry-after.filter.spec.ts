import type { ArgumentsHost } from '@nestjs/common';
import { RateLimitedException } from '../rate-limited.exception.js';
import { RetryAfterFilter } from '../retry-after.filter.js';

function fakeHost() {
  const response = {
    status: vi.fn(),
    setHeader: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.setHeader.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('RateLimitedException', () => {
  it.each([
    [10 * 60_000, 600],
    [1_500, 2],
    [1, 1],
    [0, 1],
  ])('%s ms → Retry-After de %s s (arredonda para cima, mínimo 1)', (ms, s) => {
    expect(new RateLimitedException('x', ms).retryAfterSeconds).toBe(s);
  });
});

describe('RetryAfterFilter', () => {
  it('responde 429 com a mensagem e o header Retry-After (AUTH-04, AUTH-11)', () => {
    const { host, response } = fakeHost();

    new RetryAfterFilter().catch(
      new RateLimitedException(
        'Muitas tentativas. Tente de novo em 15 minutos.',
        90_000,
      ),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '90');
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 15 minutos.',
    });
  });
});
