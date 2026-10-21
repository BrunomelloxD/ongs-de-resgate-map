import { NotFoundException } from '@nestjs/common';
import { makeAnimalImage } from '@/modules/media/test-fixtures.js';
import type { INgosRepository } from '../../repositories/ngos.repository.interface.js';
import { makeNgo, makeNgoAnimal, NGO_ID } from '../../test-fixtures.js';
import { NgosService } from '../ngos.service.js';

// Tuesday 10:30 in São Paulo: the fixture NGO is open.
const NOW = new Date('2026-10-20T13:30:00.000Z');
const BBOX = { minLng: -46.7, minLat: -23.6, maxLng: -46.6, maxLat: -23.5 };

function setup() {
  const ngos = {
    transaction: vi.fn(),
    searchByBbox: vi.fn(),
    findActiveBySlug: vi.fn(),
    findAnimals: vi.fn(),
    create: vi.fn(),
    findSlugsStartingWith: vi.fn(),
    findBySignupRequestId: vi.fn(),
    findByEmail: vi.fn(),
    existsByCnpj: vi.fn(),
    existsByEmail: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  // Signup and profile dependencies are covered in their own specs.
  const unused = {} as never;
  const service = new NgosService(
    ngos as unknown as INgosRepository,
    unused,
    unused,
    unused,
    unused,
    unused,
  );
  return { ngos, service };
}

const publicNgo = (animals = 0) => ({
  ...makeNgo(),
  _count: { animals },
});

describe('NgosService (leitura pública)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('search', () => {
    it('bbox com mais de 200 ONGs → 200 pinos e truncated: true (MAP-18)', async () => {
      const { ngos, service } = setup();
      const items = Array.from({ length: 200 }, (_, i) =>
        makeNgo({ id: `ngo-${i}`, slug: `ngo-${i}` }),
      );
      ngos.searchByBbox.mockResolvedValue({ items, truncated: true });

      const result = await service.search(BBOX, ['DOG']);

      expect(result.truncated).toBe(true);
      expect(result.items).toHaveLength(200);
      expect(result.items[0]).toMatchObject({ id: 'ngo-0', openNow: true });
      expect(ngos.searchByBbox).toHaveBeenCalledWith(BBOX, ['DOG']);
    });

    it('ONG ativa sem animais aparece no resultado (MAP-20)', async () => {
      const { ngos, service } = setup();
      ngos.searchByBbox.mockResolvedValue({
        items: [makeNgo()],
        truncated: false,
      });

      const result = await service.search(BBOX, []);

      expect(result).toEqual({
        items: [
          expect.objectContaining({ id: NGO_ID, slug: 'patas-do-bairro' }),
        ],
        truncated: false,
      });
    });
  });

  describe('getBySlug', () => {
    it('ONG ativa → DTO público com o dia de hoje', async () => {
      const { ngos, service } = setup();
      ngos.findActiveBySlug.mockResolvedValue(publicNgo(2));

      const dto = await service.getBySlug('patas-do-bairro');

      expect(dto).toMatchObject({
        id: NGO_ID,
        openNow: true,
        todayIndex: 2,
        hasAnimals: true,
      });
      expect(dto).not.toHaveProperty('email');
      expect(ngos.findActiveBySlug).toHaveBeenCalledWith('patas-do-bairro');
    });

    it('slug de ONG SUSPENDED ou inexistente → 404 "ONG não encontrada." (NGO-11)', async () => {
      const { ngos, service } = setup();
      // The repository filters status = ACTIVE, so a SUSPENDED NGO comes back null.
      ngos.findActiveBySlug.mockResolvedValue(null);

      const error = await service.getBySlug('suspensa').catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getStatus()).toBe(404);
      expect(error.message).toBe('ONG não encontrada.');
    });
  });

  describe('validações do cadastro', () => {
    it('CNPJ já cadastrado → available false; livre → true (SIGN-05)', async () => {
      const { ngos, service } = setup();
      ngos.existsByCnpj
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      expect(await service.isCnpjAvailable('11222333000181')).toBe(false);
      expect(await service.isCnpjAvailable('12ABC34501DE35')).toBe(true);
      expect(ngos.existsByCnpj).toHaveBeenCalledWith('12ABC34501DE35');
    });

    it('e-mail já cadastrado → available false; livre → true (SIGN-12)', async () => {
      const { ngos, service } = setup();
      ngos.existsByEmail
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      expect(await service.isEmailAvailable('contato@patas.org')).toBe(false);
      expect(await service.isEmailAvailable('nova@ong.org')).toBe(true);
    });
  });

  describe('listAnimals', () => {
    it('available=true por padrão, 12 por página (NGO-05, NGO-10)', async () => {
      const { ngos, service } = setup();
      ngos.findActiveBySlug.mockResolvedValue(publicNgo(13));
      ngos.findAnimals.mockResolvedValue({
        items: [makeNgoAnimal({}, [makeAnimalImage({ position: 0 })])],
        total: 13,
      });

      const result = await service.listAnimals('patas-do-bairro', {}, 2);

      expect(ngos.findAnimals).toHaveBeenCalledWith(
        NGO_ID,
        { available: true },
        { skip: 12, take: 12 },
      );
      expect(result.meta).toEqual({
        total: 13,
        page: 2,
        limit: 12,
        last_page: 2,
      });
      expect(result.data[0]).toMatchObject({
        name: 'Mel',
        cover: { alt: 'Mel, gato, porte pequeno' },
      });
    });

    it('repassa espécie, sexo, porte e available=false combinados (NGO-06, NGO-07)', async () => {
      const { ngos, service } = setup();
      ngos.findActiveBySlug.mockResolvedValue(publicNgo(1));
      ngos.findAnimals.mockResolvedValue({ items: [], total: 0 });

      const filters = {
        species: 'DOG',
        sex: 'MALE',
        size: 'LARGE',
        available: false,
      } as const;
      const result = await service.listAnimals('patas-do-bairro', filters, 1);

      expect(ngos.findAnimals).toHaveBeenCalledWith(NGO_ID, filters, {
        skip: 0,
        take: 12,
      });
      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 12, last_page: 1 },
      });
    });

    it('slug de ONG inativa → 404 sem consultar os animais (NGO-11)', async () => {
      const { ngos, service } = setup();
      ngos.findActiveBySlug.mockResolvedValue(null);

      await expect(
        service.listAnimals('suspensa', {}, 1),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ngos.findAnimals).not.toHaveBeenCalled();
    });
  });
});
