import { getClientIp } from './client-ip';

describe('getClientIp', () => {
  it('usa o primeiro IP do x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' });

    expect(getClientIp(headers)).toBe('203.0.113.5');
  });

  it('usa o x-forwarded-for com um IP só', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.5' }))).toBe(
      '203.0.113.5',
    );
  });

  it('prefere o x-forwarded-for ao x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.5',
      'x-real-ip': '198.51.100.7',
    });

    expect(getClientIp(headers)).toBe('203.0.113.5');
  });

  it('usa o x-real-ip quando não há x-forwarded-for', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '198.51.100.7' }))).toBe(
      '198.51.100.7',
    );
  });

  it.each([
    [{ 'x-forwarded-for': '' }, '198.51.100.7'],
    [{ 'x-forwarded-for': ' , 10.0.0.1' }, '198.51.100.7'],
  ])('x-forwarded-for vazio (%j) cai no x-real-ip', (extra, expected) => {
    expect(getClientIp(new Headers({ ...extra, 'x-real-ip': expected }))).toBe(
      expected,
    );
  });

  it('sem headers devolve undefined', () => {
    expect(getClientIp(new Headers())).toBeUndefined();
  });

  it('x-real-ip vazio devolve undefined', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': ' ' }))).toBeUndefined();
  });
});
