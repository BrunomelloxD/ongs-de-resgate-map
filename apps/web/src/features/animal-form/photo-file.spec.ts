import { ANIMAL_PHOTO_ACCEPT, isAcceptedAnimalPhoto } from './photo-file';

// MB = 1024².
const LIMIT = 5 * 1024 * 1024;
const file = (type: string, size = 1024, name = 'foto') => ({
  type,
  size,
  name,
});

describe('isAcceptedAnimalPhoto', () => {
  it.each([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ])('AFORM-08: aceita %s até o limite exato', (type) => {
    expect(isAcceptedAnimalPhoto(file(type, LIMIT), 5)).toBe(true);
  });

  it('AFORM-08: HEIC sem tipo (Chrome) é aceito pela extensão', () => {
    expect(isAcceptedAnimalPhoto(file('', 1024, 'IMG_0001.HEIC'), 5)).toBe(
      true,
    );
    expect(isAcceptedAnimalPhoto(file('', 1024, 'foto.heif'), 5)).toBe(true);
    expect(isAcceptedAnimalPhoto(file('', 1024, 'foto.jpg'), 5)).toBe(false);
  });

  it.each([
    ['GIF', file('image/gif')],
    ['PDF', file('application/pdf', 1024, 'foto.heic')],
    ['acima do limite', file('image/jpeg', LIMIT + 1)],
    ['vazio', file('image/jpeg', 0)],
  ])('AFORM-08: recusa %s', (_case, candidate) => {
    expect(isAcceptedAnimalPhoto(candidate, 5)).toBe(false);
  });

  it('o seletor oferece os 4 formatos, com as extensões do HEIC', () => {
    expect(ANIMAL_PHOTO_ACCEPT).toBe(
      'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif',
    );
  });
});
