import { serverActionsBodySizeLimit } from './upload-limit';

describe('serverActionsBodySizeLimit', () => {
  it.each([
    ['5', '6mb'],
    ['10', '11mb'],
  ])('MAX_UPLOAD_MB=%s vira %s', (value, expected) => {
    expect(serverActionsBodySizeLimit(value)).toBe(expected);
  });

  it.each([undefined, '', 'abc', '0', '-3', '2.5'])(
    '%j cai no padrão de 10 MB (11mb)',
    (value) => {
      expect(serverActionsBodySizeLimit(value)).toBe('11mb');
    },
  );
});
