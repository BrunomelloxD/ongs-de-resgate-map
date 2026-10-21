import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '@/app/app.module.js';
import { setupApp } from '@/app/app.setup.js';
import {
  CepAddress,
  CepNotFound,
  CepUnavailable,
  ICepProvider,
} from '@/modules/geo/adapters/cep-provider.js';
import { IGeocoder } from '@/modules/geo/adapters/nominatim-geocoder.js';
import { apiClient } from './helpers/api-client.js';

// Fakes: the tests never reach BrasilAPI, ViaCEP or Nominatim.
const CEPS: Record<string, CepAddress | Error> = {
  '01310100': {
    street: 'Avenida Paulista',
    district: 'Bela Vista',
    city: 'São Paulo',
    uf: 'SP',
    lat: -23.5613,
    lng: -46.6565,
  },
  '01001000': {
    street: 'Praça da Sé',
    district: 'Sé',
    city: 'São Paulo',
    uf: 'SP',
  },
  '00000000': new CepNotFound(),
  '99999999': new CepUnavailable(),
};
const cepProvider = {
  lookup: vi.fn((cep: string) => {
    const found = CEPS[cep];
    return found instanceof Error
      ? Promise.reject(found)
      : Promise.resolve(found);
  }),
};
const geocoder = {
  geocode: vi.fn((address: string) =>
    Promise.resolve(
      address.startsWith('Avenida Paulista, 1000')
        ? { lat: -23.5651, lng: -46.6519 }
        : null,
    ),
  ),
};

// Requires the database: docker compose up -d database
describe('Geo (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ICepProvider)
      .useValue(cepProvider)
      .overrideProvider(IGeocoder)
      .useValue(geocoder)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    cepProvider.lookup.mockClear();
    geocoder.geocode.mockClear();
  });

  describe('GET /api/v1/geo/cities (LOC-07)', () => {
    it('200 com até 5 municípios, sem acento e sem caixa', async () => {
      const res = await apiClient(app)
        .get('/api/v1/geo/cities')
        .query({ q: 'SAO PAULO' })
        .expect(200);

      expect(res.body.length).toBeLessThanOrEqual(5);
      expect(res.body).toContainEqual({
        id: 3550308,
        name: 'São Paulo',
        uf: 'SP',
        lat: -23.5329,
        lng: -46.6395,
      });
    });

    it('"vila" devolve no máximo 5', async () => {
      const res = await apiClient(app)
        .get('/api/v1/geo/cities')
        .query({ q: 'vila' })
        .expect(200);

      expect(res.body).toHaveLength(5);
    });

    it('menos de 3 caracteres devolve lista vazia', async () => {
      const res = await apiClient(app)
        .get('/api/v1/geo/cities')
        .query({ q: 'sa' })
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('sem q → 400', async () => {
      await apiClient(app).get('/api/v1/geo/cities').expect(400);
    });
  });

  describe('GET /api/v1/geo/cep/:cep', () => {
    it('200 com o endereço e o ponto do CEP (LOC-09, SIGN-17)', async () => {
      const res = await apiClient(app)
        .get('/api/v1/geo/cep/01310100')
        .expect(200);

      expect(res.body).toEqual({
        street: 'Avenida Paulista',
        district: 'Bela Vista',
        city: 'São Paulo',
        uf: 'SP',
        lat: -23.5613,
        lng: -46.6565,
      });
    });

    it('CEP sem coordenada e logradouro não geocodificado → centro do município (SIGN-20)', async () => {
      const res = await apiClient(app)
        .get('/api/v1/geo/cep/01001000')
        .expect(200);

      expect(res.body).toEqual({
        street: 'Praça da Sé',
        district: 'Sé',
        city: 'São Paulo',
        uf: 'SP',
        lat: -23.5329,
        lng: -46.6395,
      });
      expect(geocoder.geocode).toHaveBeenCalledWith(
        'Praça da Sé, São Paulo - SP',
      );
    });

    it('CEP inexistente → 404 com a mensagem do LOC-10', async () => {
      const res = await apiClient(app)
        .get('/api/v1/geo/cep/00000000')
        .expect(404);

      expect(res.body.message).toBe(
        'CEP não encontrado. Confira os números ou busque pela cidade.',
      );
    });

    it('provedor fora ou acima de 5 s → 503 com a mensagem do LOC-11', async () => {
      const res = await apiClient(app)
        .get('/api/v1/geo/cep/99999999')
        .expect(503);

      expect(res.body.message).toBe(
        'Não conseguimos buscar o CEP agora. Tente pela cidade.',
      );
    });

    it.each(['0131010', '013101000', '0131010a'])(
      'CEP "%s" sem 8 dígitos → 400 sem chamar o provedor',
      async (cep) => {
        await apiClient(app).get(`/api/v1/geo/cep/${cep}`).expect(400);

        expect(cepProvider.lookup).not.toHaveBeenCalled();
      },
    );
  });

  describe('POST /api/v1/geo/geocode', () => {
    it('endereço achado → 200 com found: true e a coordenada (SIGN-19)', async () => {
      const res = await apiClient(app)
        .post('/api/v1/geo/geocode')
        .send({ address: 'Avenida Paulista, 1000, São Paulo - SP' })
        .expect(200);

      expect(res.body).toEqual({ found: true, lat: -23.5651, lng: -46.6519 });
    });

    it('endereço não achado → 200 com found: false (SIGN-20)', async () => {
      const res = await apiClient(app)
        .post('/api/v1/geo/geocode')
        .send({ address: 'Rua que não existe, 1, Lugar Nenhum - XX' })
        .expect(200);

      expect(res.body).toEqual({ found: false, lat: null, lng: null });
    });

    it('endereço vazio → 400', async () => {
      await apiClient(app)
        .post('/api/v1/geo/geocode')
        .send({ address: '' })
        .expect(400);

      expect(geocoder.geocode).not.toHaveBeenCalled();
    });
  });
});
