import { isAcceptedNgoImage } from './ngo-image';

const MB = 1024 * 1024;

describe('isAcceptedNgoImage', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'SIGN-09: aceita %s até o limite exato',
    (type) => {
      expect(isAcceptedNgoImage({ type, size: 5 * MB }, 5)).toBe(true);
    },
  );

  it.each([
    ['GIF', { type: 'image/gif', size: 1 }],
    ['HEIC', { type: 'image/heic', size: 1 }],
    ['sem tipo', { type: '', size: 1 }],
    ['1 byte acima do limite', { type: 'image/png', size: 5 * MB + 1 }],
  ])('SIGN-10: recusa %s', (_case, file) => {
    expect(isAcceptedNgoImage(file, 5)).toBe(false);
  });
});
