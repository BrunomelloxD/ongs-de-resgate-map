import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Mocked } from 'vitest';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import { DemoQuotaService } from '@/modules/demo/services/demo-quota.service.js';
import type { MediaService } from '@/modules/media/services/media.service.js';
import { ANIMAL_ID, makeAnimal, NGO_ID } from '../../test-fixtures.js';
import {
  IAnimalsRepository,
  type Tx,
} from '../../repositories/animals.repository.interface.js';
import { AnimalsService } from '../animals.service.js';

const NOW = new Date('2026-10-21T15:00:00.000Z');
const IMAGE_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
];
const INPUT = {
  name: 'Mel',
  species: 'CAT',
  breed: 'SRD (vira-lata)',
  sex: 'FEMALE',
  size: 'SMALL',
  ageValue: 2,
  ageUnit: 'YEARS',
  description: null,
  imageIds: IMAGE_IDS,
} as const;
const NOT_FOUND = new NotFoundException('Animal não encontrado.');

/** Real quota rules over a fake transaction that already has `animals` rows. */
function setup({ animals: existing = 0, maxAnimals = 10 } = {}) {
  const calls: string[] = [];
  const tx = {
    $executeRaw: vi.fn(() => {
      calls.push('lock');
      return Promise.resolve(0);
    }),
    animal: { count: vi.fn(() => Promise.resolve(existing)) },
  };
  const animals = {
    transaction: vi.fn((fn: (tx: Tx) => unknown) => fn(tx as unknown as Tx)),
    findPublicById: vi.fn(),
    findAllOfNgo: vi.fn(),
    findOwn: vi.fn(),
    create: vi.fn(() => {
      calls.push('create');
      return Promise.resolve(makeAnimal({ images: [] }));
    }),
    update: vi.fn(),
    delete: vi.fn(() => {
      calls.push('delete');
      return Promise.resolve();
    }),
  } as unknown as Mocked<IAnimalsRepository>;
  const media = {
    attachToAnimal: vi.fn(() => {
      calls.push('attach');
      return Promise.resolve();
    }),
    deleteImages: vi.fn(() => {
      calls.push('deleteImages');
      return Promise.resolve();
    }),
  } as unknown as Mocked<MediaService>;
  const quota = new DemoQuotaService({
    demo: { enabled: true, maxAnimalsPerNgo: maxAnimals },
  } as AppConfigService);
  const service = new AnimalsService(animals, media, quota);
  return { calls, tx, animals, media, service };
}

describe('AnimalsService — escrita', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('cria o animal disponível, da ONG da sessão, e anexa as fotos na mesma transação (AFORM-01)', async () => {
      const { calls, tx, animals, media, service } = setup();
      const saved = makeAnimal();
      animals.findOwn.mockResolvedValue(saved);

      const dto = await service.create(NGO_ID, INPUT);

      const { imageIds: _ids, ...fields } = INPUT;
      expect(animals.create).toHaveBeenCalledWith(tx, {
        ...fields,
        ngoId: NGO_ID,
        available: true,
      });
      expect(media.attachToAnimal).toHaveBeenCalledWith(
        tx,
        NGO_ID,
        ANIMAL_ID,
        IMAGE_IDS,
      );
      // Lock and count before the insert (AD-004).
      expect(calls).toEqual(['lock', 'create', 'attach']);
      expect(tx.$executeRaw.mock.calls[0]).toContain(`quota:animals:${NGO_ID}`);
      expect(dto.available).toBe(true);
      expect(dto.id).toBe(ANIMAL_ID);
    });

    it('a 11ª criação com limite 10 → 409 com a mensagem do DEMO-09, sem gravar', async () => {
      const { animals, media, service } = setup({
        animals: 10,
        maxAnimals: 10,
      });

      await expect(service.create(NGO_ID, INPUT)).rejects.toEqual(
        new ConflictException(
          'Sua ONG atingiu o limite de 10 animais da demo. Exclua um animal para cadastrar outro.',
        ),
      );
      expect(animals.create).not.toHaveBeenCalled();
      expect(media.attachToAnimal).not.toHaveBeenCalled();
    });

    it('a 10ª criação com limite 10 passa', async () => {
      const { animals, service } = setup({ animals: 9, maxAnimals: 10 });
      animals.findOwn.mockResolvedValue(makeAnimal());

      await service.create(NGO_ID, INPUT);

      expect(animals.create).toHaveBeenCalledTimes(1);
    });

    it('falha ao anexar as fotos → o erro sobe e a transação desfaz o animal', async () => {
      const { animals, media, service } = setup();
      media.attachToAnimal.mockRejectedValueOnce(
        new NotFoundException('Foto não encontrada.'),
      );

      await expect(service.create(NGO_ID, INPUT)).rejects.toEqual(
        new NotFoundException('Foto não encontrada.'),
      );
      expect(animals.findOwn).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('grava os campos, troca a lista de fotos e devolve o animal atualizado (AFORM-13, AFORM-14)', async () => {
      const { tx, animals, media, service } = setup();
      animals.findOwn
        .mockResolvedValueOnce(makeAnimal())
        .mockResolvedValueOnce(makeAnimal({ name: 'Mel Nova' }));

      const dto = await service.update(NGO_ID, ANIMAL_ID, {
        name: 'Mel Nova',
        imageIds: [IMAGE_IDS[1]!],
      });

      expect(animals.update).toHaveBeenCalledWith(tx, NGO_ID, ANIMAL_ID, {
        name: 'Mel Nova',
      });
      expect(media.attachToAnimal).toHaveBeenCalledWith(tx, NGO_ID, ANIMAL_ID, [
        IMAGE_IDS[1],
      ]);
      expect(dto.name).toBe('Mel Nova');
    });

    it('sem imageIds não mexe nas fotos', async () => {
      const { animals, media, service } = setup();
      animals.findOwn.mockResolvedValue(makeAnimal());

      await service.update(NGO_ID, ANIMAL_ID, { ageValue: 3 });

      expect(media.attachToAnimal).not.toHaveBeenCalled();
    });

    it('animal de outra ONG → 404 e nada muda (SEC-06)', async () => {
      const { animals, media, service } = setup();
      animals.findOwn.mockResolvedValue(null);

      await expect(
        service.update(NGO_ID, ANIMAL_ID, { name: 'Outro' }),
      ).rejects.toEqual(NOT_FOUND);
      expect(animals.update).not.toHaveBeenCalled();
      expect(media.attachToAnimal).not.toHaveBeenCalled();
    });
  });

  describe('setAvailability', () => {
    it('muda available e availableChangedAt para agora (DASH-02)', async () => {
      const { tx, animals, service } = setup();
      animals.findOwn.mockResolvedValue(makeAnimal({ available: true }));

      const dto = await service.setAvailability(NGO_ID, ANIMAL_ID, false);

      expect(animals.update).toHaveBeenCalledWith(tx, NGO_ID, ANIMAL_ID, {
        available: false,
        availableChangedAt: NOW,
      });
      expect(dto.available).toBe(false);
      expect(dto.availableChangedAt).toEqual(NOW);
    });

    it('mesmo valor → não grava nem muda availableChangedAt', async () => {
      const { animals, service } = setup();
      const before = new Date('2026-10-20T12:00:00.000Z');
      animals.findOwn.mockResolvedValue(
        makeAnimal({ available: true, availableChangedAt: before }),
      );

      const dto = await service.setAvailability(NGO_ID, ANIMAL_ID, true);

      expect(animals.update).not.toHaveBeenCalled();
      expect(dto.availableChangedAt).toEqual(before);
    });

    it('animal de outra ONG → 404 (SEC-06)', async () => {
      const { animals, service } = setup();
      animals.findOwn.mockResolvedValue(null);

      await expect(
        service.setAvailability(NGO_ID, ANIMAL_ID, false),
      ).rejects.toEqual(NOT_FOUND);
      expect(animals.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('apaga as fotos (banco e bucket) antes do animal (AFORM-16)', async () => {
      const { calls, tx, animals, media, service } = setup();
      animals.findOwn.mockResolvedValue(makeAnimal());

      await service.delete(NGO_ID, ANIMAL_ID);

      expect(media.deleteImages).toHaveBeenCalledWith(tx, NGO_ID, ANIMAL_ID);
      expect(animals.delete).toHaveBeenCalledWith(tx, NGO_ID, ANIMAL_ID);
      expect(calls).toEqual(['deleteImages', 'delete']);
    });

    it('bucket fora → 503 e o animal não é apagado', async () => {
      const { animals, media, service } = setup();
      animals.findOwn.mockResolvedValue(makeAnimal());
      media.deleteImages.mockRejectedValueOnce(
        new ServiceUnavailableException(
          'Não foi possível excluir agora. Tente de novo.',
        ),
      );

      await expect(service.delete(NGO_ID, ANIMAL_ID)).rejects.toEqual(
        new ServiceUnavailableException(
          'Não foi possível excluir agora. Tente de novo.',
        ),
      );
      expect(animals.delete).not.toHaveBeenCalled();
    });

    it('animal de outra ONG → 404 e nada é apagado (SEC-06)', async () => {
      const { animals, media, service } = setup();
      animals.findOwn.mockResolvedValue(null);

      await expect(service.delete(NGO_ID, ANIMAL_ID)).rejects.toEqual(
        NOT_FOUND,
      );
      expect(media.deleteImages).not.toHaveBeenCalled();
      expect(animals.delete).not.toHaveBeenCalled();
    });
  });
});
