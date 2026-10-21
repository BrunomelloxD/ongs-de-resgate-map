import { NotFoundException } from '@nestjs/common';
import type { Mocked } from 'vitest';
import type { DemoQuotaService } from '@/modules/demo/services/demo-quota.service.js';
import type { MediaService } from '@/modules/media/services/media.service.js';
import {
  ANIMAL_ID,
  makeAnimal,
  makePublicAnimal,
  NGO_ID,
} from '../../test-fixtures.js';
import { IAnimalsRepository } from '../../repositories/animals.repository.interface.js';
import { AnimalsService } from '../animals.service.js';

function setup() {
  const animals = {
    transaction: vi.fn(),
    findPublicById: vi.fn(),
    findAllOfNgo: vi.fn(),
    findOwn: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as Mocked<IAnimalsRepository>;
  // Reads touch neither media nor the quotas.
  const service = new AnimalsService(
    animals,
    {} as MediaService,
    {} as DemoQuotaService,
  );
  return { animals, service };
}

describe('AnimalsService — leitura', () => {
  describe('getPublic', () => {
    it('animal da ONG ativa do slug → DTO público com a ONG resumida (ANI-01)', async () => {
      const { animals, service } = setup();
      animals.findPublicById.mockResolvedValue(makePublicAnimal());

      const dto = await service.getPublic(ANIMAL_ID, 'patas-do-bairro');

      expect(animals.findPublicById).toHaveBeenCalledWith(ANIMAL_ID);
      expect(dto.id).toBe(ANIMAL_ID);
      expect(dto.ngo.slug).toBe('patas-do-bairro');
    });

    it('id inexistente → 404 (ANI-06)', async () => {
      const { animals, service } = setup();
      animals.findPublicById.mockResolvedValue(null);

      await expect(
        service.getPublic(ANIMAL_ID, 'patas-do-bairro'),
      ).rejects.toEqual(new NotFoundException('Animal não encontrado.'));
    });

    it('id de outro slug → 404 (ANI-06)', async () => {
      const { animals, service } = setup();
      animals.findPublicById.mockResolvedValue(makePublicAnimal());

      await expect(service.getPublic(ANIMAL_ID, 'outra-ong')).rejects.toEqual(
        new NotFoundException('Animal não encontrado.'),
      );
    });

    it('ONG suspensa → 404 (ANI-06)', async () => {
      const { animals, service } = setup();
      const record = makePublicAnimal();
      record.ngo.status = 'SUSPENDED';
      animals.findPublicById.mockResolvedValue(record);

      await expect(
        service.getPublic(ANIMAL_ID, 'patas-do-bairro'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listMine', () => {
    it('lista só os animais da ONG da sessão, com o filtro escolhido (DASH-01, DASH-05)', async () => {
      const { animals, service } = setup();
      animals.findAllOfNgo.mockResolvedValue([
        makeAnimal({ name: 'João', species: 'DOG' }),
      ]);

      const list = await service.listMine(NGO_ID, 'joao', 'dogs');

      expect(animals.findAllOfNgo).toHaveBeenCalledWith(NGO_ID, {
        search: 'joao',
        filter: 'dogs',
      });
      expect(list.map((animal) => animal.name)).toEqual(['João']);
    });

    it('busca com espaços nas pontas é aparada; vazia não vira filtro (DASH-04)', async () => {
      const { animals, service } = setup();
      animals.findAllOfNgo.mockResolvedValue([]);

      await service.listMine(NGO_ID, '  joao ', 'all');
      await service.listMine(NGO_ID, '   ', 'all');
      await service.listMine(NGO_ID, undefined, 'all');

      expect(animals.findAllOfNgo.mock.calls).toEqual([
        [NGO_ID, { search: 'joao', filter: 'all' }],
        [NGO_ID, { search: undefined, filter: 'all' }],
        [NGO_ID, { search: undefined, filter: 'all' }],
      ]);
    });
  });
});
