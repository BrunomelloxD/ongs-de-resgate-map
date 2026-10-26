import { makeAnimalImage } from '@/modules/media/test-fixtures.js';
import { makeNgo, makeNgoAnimal, NGO_ID } from '../../test-fixtures.js';
import { NgoMapper } from '../ngo.mapper.js';

// Tuesday 2026-10-20, 10:30 in São Paulo (UTC−3): open, 09:00–18:00.
const TUESDAY_OPEN = new Date('2026-10-20T13:30:00.000Z');
// Sunday 2026-10-25, 12:00 in São Paulo: closed all day.
const SUNDAY = new Date('2026-10-25T15:00:00.000Z');

const FORBIDDEN = [
  'email',
  'cnpj',
  'passwordHash',
  'signupIpHash',
  'signupRequestId',
  'imageKey',
  'imageBytes',
  'status',
  'isSeed',
  'termsVersion',
];

describe('NgoMapper', () => {
  describe('toPin', () => {
    it('só tem id, slug, nome, lat, lng, openNow, todayHours e thumbUrl (MAP-18)', () => {
      const ngo = makeNgo();

      const pin = NgoMapper.toPin(ngo, TUESDAY_OPEN);

      expect(Object.keys(pin).sort()).toEqual(
        [
          'id',
          'slug',
          'name',
          'lat',
          'lng',
          'openNow',
          'todayHours',
          'thumbUrl',
        ].sort(),
      );
      expect(pin).toEqual({
        id: NGO_ID,
        slug: 'patas-do-bairro',
        name: 'Patas do Bairro',
        lat: -23.5869,
        lng: -46.6347,
        openNow: true,
        todayHours: { closed: false, opensAt: '09:00', closesAt: '18:00' },
        thumbUrl: `/img/${ngo.imageKey}-160.webp`,
      });
    });

    it('domingo fechado → openNow false e todayHours fechado (NGO-02)', () => {
      const pin = NgoMapper.toPin(makeNgo(), SUNDAY);

      expect(pin.openNow).toBe(false);
      expect(pin.todayHours).toEqual({
        closed: true,
        opensAt: null,
        closesAt: null,
      });
    });

    it('sem horário do dia → todayHours null', () => {
      const pin = NgoMapper.toPin(makeNgo({ openingHours: [] }), SUNDAY);

      expect(pin.todayHours).toBeNull();
      expect(pin.openNow).toBe(false);
    });

    it('ONG sem imagem → thumbUrl null', () => {
      expect(
        NgoMapper.toPin(makeNgo({ imageKey: null }), SUNDAY).thumbUrl,
      ).toBeNull();
    });
  });

  describe('toPublic', () => {
    const ngo = { ...makeNgo(), _count: { animals: 3 } };

    it('não tem e-mail, CNPJ, hash da senha nem chaves internas (SEC-04)', () => {
      const dto = NgoMapper.toPublic(ngo, TUESDAY_OPEN);

      for (const key of FORBIDDEN) {
        expect(dto).not.toHaveProperty(key);
      }
      expect(JSON.stringify(dto)).not.toContain('contato@patas.org');
      expect(JSON.stringify(dto)).not.toContain('11222333000181');
    });

    it('traz os dados da página, com imagem de 600 px e WhatsApp com a mensagem da ONG (NGO-01, NGO-03)', () => {
      const dto = NgoMapper.toPublic(ngo, TUESDAY_OPEN);

      expect(dto).toMatchObject({
        id: NGO_ID,
        slug: 'patas-do-bairro',
        name: 'Patas do Bairro',
        description: 'Resgatamos cães e gatos na zona sul de São Paulo.',
        imageUrl: `/img/${ngo.imageKey}-600.webp`,
        whatsappUrl: `https://wa.me/5511987654321?text=${encodeURIComponent('Olá! Vi a Patas do Bairro no Animal Helper.')}`,
        address: {
          cep: '04101300',
          street: 'Rua Vergueiro',
          number: '3000',
          complement: null,
          district: 'Vila Mariana',
          city: 'São Paulo',
          uf: 'SP',
        },
        lat: -23.5869,
        lng: -46.6347,
        openNow: true,
        hasAnimals: true,
      });
    });

    it('weekHours tem os 7 dias em ordem e todayIndex é o dia no fuso da ONG', () => {
      const dto = NgoMapper.toPublic(ngo, TUESDAY_OPEN);

      expect(dto.weekHours).toHaveLength(7);
      expect(dto.weekHours.map((day) => day.dayOfWeek)).toEqual([
        0, 1, 2, 3, 4, 5, 6,
      ]);
      expect(dto.weekHours[2]).toEqual({
        dayOfWeek: 2,
        closed: false,
        opensAt: '09:00',
        closesAt: '18:00',
      });
      expect(dto.todayIndex).toBe(2);
      // 01:00 UTC on Wednesday is still Tuesday 22:00 in São Paulo.
      expect(
        NgoMapper.toPublic(ngo, new Date('2026-10-21T01:00:00.000Z'))
          .todayIndex,
      ).toBe(2);
    });

    it('dia sem linha no banco aparece como fechado, para manter os 7 dias', () => {
      const partial = {
        ...makeNgo({ openingHours: makeNgo().openingHours.slice(1) }),
        _count: { animals: 0 },
      };

      const dto = NgoMapper.toPublic(partial, TUESDAY_OPEN);

      expect(dto.weekHours).toHaveLength(7);
      expect(dto.weekHours[0]).toEqual({
        dayOfWeek: 0,
        closed: true,
        opensAt: null,
        closesAt: null,
      });
      expect(dto.hasAnimals).toBe(false);
    });

    it('ONG sem imagem → imageUrl: null', () => {
      const dto = NgoMapper.toPublic(
        { ...makeNgo({ imageKey: null }), _count: { animals: 0 } },
        TUESDAY_OPEN,
      );

      expect(dto.imageUrl).toBeNull();
    });
  });

  describe('toMe', () => {
    it('traz os dados editáveis, CNPJ e e-mail, sem hash nem chaves internas (PROF-01)', () => {
      const ngo = makeNgo();

      const dto = NgoMapper.toMe(ngo, TUESDAY_OPEN);

      expect(dto).toEqual({
        id: NGO_ID,
        slug: 'patas-do-bairro',
        cnpj: '11222333000181',
        legalName: 'Patas do Bairro',
        description: 'Resgatamos cães e gatos na zona sul de São Paulo.',
        imageUrl: `/img/${ngo.imageKey}-600.webp`,
        email: 'contato@patas.org',
        whatsapp: '5511987654321',
        address: {
          cep: '04101300',
          street: 'Rua Vergueiro',
          number: '3000',
          complement: null,
          district: 'Vila Mariana',
          city: 'São Paulo',
          uf: 'SP',
        },
        lat: -23.5869,
        lng: -46.6347,
        locationConfirmedAt: ngo.locationConfirmedAt,
        timezone: 'America/Sao_Paulo',
        weekHours: expect.any(Array),
        openNow: true,
        todayIndex: 2,
        expiresAt: ngo.expiresAt,
        createdAt: ngo.createdAt,
      });
      expect(dto.weekHours).toHaveLength(7);
      expect(dto).not.toHaveProperty('passwordHash');
      expect(dto).not.toHaveProperty('signupIpHash');
    });

    it('ONG sem imagem → imageUrl: null', () => {
      expect(
        NgoMapper.toMe(makeNgo({ imageKey: null }), TUESDAY_OPEN).imageUrl,
      ).toBeNull();
    });
  });

  describe('toAnimal', () => {
    it('capa de 1200 px, com a de 600 para o card, e alt "Mel, gato, porte pequeno" (ANI-02, A11Y-11, T174)', () => {
      const cover = makeAnimalImage({ position: 0, width: 1200, height: 900 });

      const dto = NgoMapper.toAnimal(makeNgoAnimal({}, [cover]));

      expect(dto).toEqual({
        id: '5d0e8a51-6c2b-4f3a-8e7d-1a9b0c2d3e44',
        name: 'Mel',
        species: 'CAT',
        sex: 'FEMALE',
        size: 'SMALL',
        ageValue: 2,
        ageUnit: 'YEARS',
        available: true,
        cover: {
          url: `/img/${cover.keyPrefix}-1200.webp`,
          mediumUrl: `/img/${cover.keyPrefix}-600.webp`,
          thumbUrl: `/img/${cover.keyPrefix}-160.webp`,
          width: 1200,
          height: 900,
          alt: 'Mel, gato, porte pequeno',
        },
      });
    });

    it.each([
      ['DOG', 'MEDIUM', 'Rex, cão, porte médio'],
      ['OTHER', 'LARGE', 'Rex, outro, porte grande'],
    ] as const)('%s porte %s → alt "%s"', (species, size, alt) => {
      const dto = NgoMapper.toAnimal(
        makeNgoAnimal({ name: 'Rex', species, size }, [
          makeAnimalImage({ position: 0 }),
        ]),
      );

      expect(dto.cover?.alt).toBe(alt);
    });

    it('animal sem foto → cover: null', () => {
      expect(NgoMapper.toAnimal(makeNgoAnimal()).cover).toBeNull();
    });
  });
});
