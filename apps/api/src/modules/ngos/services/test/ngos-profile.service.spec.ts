import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client.js';
import type { INgosRepository } from '../../repositories/ngos.repository.interface.js';
import { makeNgo, NGO_ID, weekHours } from '../../test-fixtures.js';
import { NgosService } from '../ngos.service.js';

const NOW = new Date('2026-10-20T13:30:00.000Z');
// The fixture NGO confirmed its pin at 2026-10-20T12:00Z.
const CONFIRMED_BEFORE = new Date('2026-10-20T11:00:00.000Z');
const CONFIRMED_AGAIN = new Date('2026-10-20T13:00:00.000Z');

function setup(current = makeNgo({ passwordHash: 'hashed:senha1234' })) {
  const log: string[] = [];
  const ngos = {
    findById: vi.fn().mockResolvedValue(current),
    findByEmail: vi.fn(),
    update: vi.fn((_id: string, data: Record<string, unknown>) =>
      Promise.resolve(makeNgo({ ...current, ...data })),
    ),
    delete: vi.fn(() => {
      log.push('delete ngo');
      return Promise.resolve();
    }),
  };
  const hasher = {
    hash: vi.fn((plain: string) => Promise.resolve(`hashed:${plain}`)),
    verify: vi.fn((hashed: string, plain: string) =>
      Promise.resolve(hashed === `hashed:${plain}`),
    ),
  };
  const media = {
    uploadNgoImage: vi.fn().mockResolvedValue({ imageKey: 'key' }),
    deleteNgoPrefix: vi.fn(() => {
      log.push('delete prefix');
      return Promise.resolve({ count: 4, bytes: 1000 });
    }),
  };
  const service = new NgosService(
    ngos as unknown as INgosRepository,
    {} as never,
    {} as never,
    hasher as never,
    {} as never,
    media as never,
  );
  return { log, ngos, hasher, media, service, current };
}

/** Data passed to the repository's update. */
function updated(ngos: ReturnType<typeof setup>['ngos']) {
  return ngos.update.mock.calls[0][1];
}

describe('NgosService (perfil e conta)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getMe devolve os dados da própria ONG (PROF-01)', async () => {
    const { ngos, service } = setup();

    const dto = await service.getMe(NGO_ID);

    expect(ngos.findById).toHaveBeenCalledWith(NGO_ID);
    expect(dto).toMatchObject({ id: NGO_ID, cnpj: '11222333000181' });
    expect(dto).not.toHaveProperty('passwordHash');
  });

  it('getMe de ONG que não existe mais → 404', async () => {
    const { ngos, service } = setup();
    ngos.findById.mockResolvedValue(null);

    await expect(service.getMe(NGO_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('updateMe', () => {
    it('mudar a UF de SP para AM troca o fuso para America/Manaus (borda: fuso)', async () => {
      const { ngos, service } = setup();

      const dto = await service.updateMe(NGO_ID, {
        uf: 'AM',
        city: 'Manaus',
        locationConfirmedAt: CONFIRMED_AGAIN,
      });

      expect(updated(ngos)).toMatchObject({
        uf: 'AM',
        timezone: 'America/Manaus',
      });
      expect(dto.timezone).toBe('America/Manaus');
    });

    it('editar não muda expiresAt (DEMO-05)', async () => {
      const { ngos, current, service } = setup();

      const dto = await service.updateMe(NGO_ID, {
        description: 'Nova descrição com mais de trinta caracteres.',
      });

      expect(updated(ngos)).toEqual({
        description: 'Nova descrição com mais de trinta caracteres.',
      });
      expect(updated(ngos)).not.toHaveProperty('expiresAt');
      expect(dto.expiresAt).toEqual(current.expiresAt);
    });

    it('troca os horários quando vêm no corpo', async () => {
      const { ngos, service } = setup();
      const hours = weekHours();

      await service.updateMe(NGO_ID, { openingHours: hours });

      expect(ngos.update).toHaveBeenCalledWith(NGO_ID, {}, hours);
    });

    it.each([
      ['cep', '01310100'],
      ['street', 'Avenida Paulista'],
      ['number', '1000'],
      ['city', 'Campinas'],
      ['uf', 'RJ'],
    ])(
      'alterar %s sem confirmar o pino de novo → 400 (PROF-03)',
      async (field, value) => {
        const { ngos, service } = setup();

        const error = await service
          .updateMe(NGO_ID, { [field]: value })
          .catch((e) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Confirme a localização no mapa antes de salvar.',
        );
        expect(ngos.update).not.toHaveBeenCalled();
      },
    );

    it('confirmação antiga do pino não vale para um endereço novo (PROF-03)', async () => {
      const { ngos, service } = setup();

      await expect(
        service.updateMe(NGO_ID, {
          street: 'Avenida Paulista',
          locationConfirmedAt: CONFIRMED_BEFORE,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ngos.update).not.toHaveBeenCalled();
    });

    it('endereço alterado com o pino confirmado de novo → grava', async () => {
      const { ngos, service } = setup();

      await service.updateMe(NGO_ID, {
        street: 'Avenida Paulista',
        lat: -23.56,
        lng: -46.65,
        locationConfirmedAt: CONFIRMED_AGAIN,
      });

      expect(updated(ngos)).toMatchObject({
        street: 'Avenida Paulista',
        lat: -23.56,
        locationConfirmedAt: CONFIRMED_AGAIN,
      });
    });

    it('reenviar o mesmo endereço não pede o pino de novo', async () => {
      const { ngos, current, service } = setup();

      await service.updateMe(NGO_ID, {
        cep: current.cep,
        street: current.street,
      });

      expect(ngos.update).toHaveBeenCalled();
    });

    it('e-mail já usado por outra ONG → 409 com field "email"', async () => {
      const { ngos, service } = setup();
      ngos.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique', {
          code: 'P2002',
          clientVersion: 'test',
          meta: {
            driverAdapterError: {
              cause: { constraint: { index: 'ngos_email_key' } },
            },
          },
        }),
      );

      const error = await service
        .updateMe(NGO_ID, { email: 'outra@ong.org' })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({
        statusCode: 409,
        field: 'email',
      });
    });

    it('outros erros do update seguem sem tradução', async () => {
      const { ngos, service } = setup();
      const failure = new Error('db down');
      ngos.update.mockRejectedValue(failure);

      await expect(
        service.updateMe(NGO_ID, { description: 'x'.repeat(40) }),
      ).rejects.toBe(failure);
    });
  });

  it('updateImage envia a imagem da ONG e devolve o perfil (SIGN-09)', async () => {
    const { media, service } = setup();
    const file = { buffer: Buffer.from('img'), size: 3 };

    const dto = await service.updateImage(NGO_ID, file);

    expect(media.uploadNgoImage).toHaveBeenCalledWith(NGO_ID, file);
    expect(dto.id).toBe(NGO_ID);
  });

  describe('deleteAccount', () => {
    it('senha certa → apaga o prefixo no bucket e depois a ONG (PROF-08)', async () => {
      const { log, media, ngos, service } = setup();

      await service.deleteAccount(NGO_ID, 'senha1234');

      expect(media.deleteNgoPrefix).toHaveBeenCalledWith(NGO_ID);
      expect(ngos.delete).toHaveBeenCalledWith(NGO_ID);
      expect(log).toEqual(['delete prefix', 'delete ngo']);
    });

    it('senha errada → 403 "Senha atual incorreta." e nada apagado', async () => {
      const { media, ngos, service } = setup();

      const error = await service
        .deleteAccount(NGO_ID, 'errada123')
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getStatus()).toBe(403);
      expect(error.message).toBe('Senha atual incorreta.');
      expect(media.deleteNgoPrefix).not.toHaveBeenCalled();
      expect(ngos.delete).not.toHaveBeenCalled();
    });

    it('bucket fora → 503 e a ONG fica no banco', async () => {
      const { media, ngos, service } = setup();
      media.deleteNgoPrefix.mockRejectedValue(
        new ServiceUnavailableException(
          'Não foi possível excluir agora. Tente de novo.',
        ),
      );

      const error = await service
        .deleteAccount(NGO_ID, 'senha1234')
        .catch((e) => e);

      expect(error.getStatus()).toBe(503);
      expect(error.message).toBe(
        'Não foi possível excluir agora. Tente de novo.',
      );
      expect(ngos.delete).not.toHaveBeenCalled();
    });
  });

  it('findByEmailForAuth busca pelo e-mail no repositório', async () => {
    const { ngos, service } = setup();
    const found = makeNgo();
    ngos.findByEmail.mockResolvedValue(found);

    expect(await service.findByEmailForAuth('contato@patas.org')).toBe(found);
    expect(ngos.findByEmail).toHaveBeenCalledWith('contato@patas.org');
  });

  it('findByIdForAuth busca pelo id no repositório, com o hash', async () => {
    const { ngos, service, current } = setup();

    expect(await service.findByIdForAuth(NGO_ID)).toBe(current);
    expect(ngos.findById).toHaveBeenCalledWith(NGO_ID);
  });

  it('updatePassword grava só o hash da nova senha', async () => {
    const { ngos, service } = setup();

    await service.updatePassword(NGO_ID, 'novaSenha1');

    expect(ngos.update).toHaveBeenCalledWith(NGO_ID, {
      passwordHash: 'hashed:novaSenha1',
    });
  });
});
