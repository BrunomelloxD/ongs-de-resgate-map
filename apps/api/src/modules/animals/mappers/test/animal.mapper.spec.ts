import {
  ANIMAL_ID,
  makeAnimal,
  makeImage,
  makePublicAnimal,
  NGO_ID,
} from '../../test-fixtures.js';
import { AnimalMapper } from '../animal.mapper.js';

const COVER_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_ID = '22222222-2222-4222-8222-222222222222';
// Out of order on purpose: the mapper must put position 0 first.
const IMAGES = [
  makeImage(1, { id: SECOND_ID, width: 800, height: 600 }),
  makeImage(0, { id: COVER_ID }),
];

describe('AnimalMapper', () => {
  describe('toPublic', () => {
    it('alt = "{nome}, {espécie}, porte {porte}" em toda foto (A11Y-11)', () => {
      const dto = AnimalMapper.toPublic(makePublicAnimal({ images: IMAGES }));

      expect(dto.images.map((image) => image.alt)).toEqual([
        'Mel, gato, porte pequeno',
        'Mel, gato, porte pequeno',
      ]);
    });

    it('a foto de posição 0 vem primeiro, com URLs /img de 1200 e 160 px (ANI-02)', () => {
      const dto = AnimalMapper.toPublic(makePublicAnimal({ images: IMAGES }));

      expect(dto.images).toEqual([
        {
          id: COVER_ID,
          url: `/img/ngos/${NGO_ID}/images/${COVER_ID}-1200.webp`,
          thumbUrl: `/img/ngos/${NGO_ID}/images/${COVER_ID}-160.webp`,
          width: 1200,
          height: 900,
          alt: 'Mel, gato, porte pequeno',
        },
        {
          id: SECOND_ID,
          url: `/img/ngos/${NGO_ID}/images/${SECOND_ID}-1200.webp`,
          thumbUrl: `/img/ngos/${NGO_ID}/images/${SECOND_ID}-160.webp`,
          width: 800,
          height: 600,
          alt: 'Mel, gato, porte pequeno',
        },
      ]);
    });

    it('alt de cão grande e de outro médio', () => {
      expect(
        AnimalMapper.toPublic(
          makePublicAnimal({ name: 'Rex', species: 'DOG', size: 'LARGE' }),
        ).images[0]?.alt,
      ).toBe('Rex, cão, porte grande');
      expect(
        AnimalMapper.toPublic(
          makePublicAnimal({ name: 'Tico', species: 'OTHER', size: 'MEDIUM' }),
        ).images[0]?.alt,
      ).toBe('Tico, outro, porte médio');
    });

    it('fêmea disponível → wa.me com "Olá! Vi a Mel..." codificado (ANI-04)', () => {
      const dto = AnimalMapper.toPublic(makePublicAnimal());

      expect(dto.whatsappUrl).toBe(
        `https://wa.me/5511987654321?text=${encodeURIComponent(
          'Olá! Vi a Mel no Animal Helper e quero saber como adotar.',
        )}`,
      );
    });

    it('macho disponível → "Olá! Vi o Caramelo..." (ANI-04)', () => {
      const dto = AnimalMapper.toPublic(
        makePublicAnimal({ name: 'Caramelo', sex: 'MALE' }),
      );

      expect(dto.whatsappUrl).toBe(
        `https://wa.me/5511987654321?text=${encodeURIComponent(
          'Olá! Vi o Caramelo no Animal Helper e quero saber como adotar.',
        )}`,
      );
    });

    it('animal indisponível → whatsappUrl: null (ANI-05)', () => {
      const dto = AnimalMapper.toPublic(makePublicAnimal({ available: false }));

      expect(dto.available).toBe(false);
      expect(dto.whatsappUrl).toBeNull();
    });

    it('dados do animal e a ONG resumida, sem e-mail nem CNPJ (ANI-01, SEC-04)', () => {
      const record = makePublicAnimal();
      const dto = AnimalMapper.toPublic(record);

      expect(dto).toMatchObject({
        id: ANIMAL_ID,
        name: 'Mel',
        species: 'CAT',
        breed: 'SRD (vira-lata)',
        sex: 'FEMALE',
        size: 'SMALL',
        ageValue: 2,
        ageUnit: 'YEARS',
        description: 'Calma e carinhosa.',
        available: true,
      });
      expect(dto.ngo).toEqual({
        id: NGO_ID,
        slug: 'patas-do-bairro',
        name: 'Patas do Bairro',
        imageUrl: `/img/${record.ngo.imageKey}-160.webp`,
        city: 'São Paulo',
        uf: 'SP',
      });
      const json = JSON.stringify(dto);
      for (const key of ['email', 'cnpj', 'passwordHash', 'whatsapp"']) {
        expect(json).not.toContain(`"${key}`);
      }
      expect(json).not.toContain(record.ngo.email);
      expect(json).not.toContain(record.ngo.cnpj);
    });

    it('ONG sem imagem → imageUrl: null', () => {
      const record = makePublicAnimal();
      record.ngo.imageKey = null;

      expect(AnimalMapper.toPublic(record).ngo.imageUrl).toBeNull();
    });
  });

  describe('toMe', () => {
    it('todas as fotos com id, capa primeiro, e availableChangedAt (DASH-01, DASH-02)', () => {
      const changedAt = new Date('2026-10-21T09:30:00.000Z');
      const dto = AnimalMapper.toMe(
        makeAnimal({ images: IMAGES, availableChangedAt: changedAt }),
      );

      expect(dto.images.map((image) => image.id)).toEqual([
        COVER_ID,
        SECOND_ID,
      ]);
      expect(dto.availableChangedAt).toBe(changedAt);
      expect(dto.createdAt).toEqual(new Date('2026-10-20T12:00:00.000Z'));
      expect(dto).not.toHaveProperty('ngoId');
      expect(dto).not.toHaveProperty('whatsappUrl');
    });
  });
});
