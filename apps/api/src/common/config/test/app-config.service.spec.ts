import type { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../app-config.service.js';
import type { Env } from '../env.schema.js';

function serviceWith(env: Partial<Env>) {
  const config = {
    get: vi.fn((key: keyof Env) => env[key]),
  } as unknown as ConfigService<Env, true>;
  return new AppConfigService(config);
}

describe('AppConfigService', () => {
  it('lê as variáveis tipadas do ConfigService', () => {
    expect(serviceWith({ PORT: 4000 }).get('PORT')).toBe(4000);
  });

  it('isProduction é true só em produção', () => {
    expect(serviceWith({ NODE_ENV: 'production' }).isProduction).toBe(true);
    expect(serviceWith({ NODE_ENV: 'development' }).isProduction).toBe(false);
  });

  it('expõe o armazenamento S3 agrupado', () => {
    const service = serviceWith({
      S3_ENDPOINT: 'http://minio:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'animal-helper-dev',
      S3_ACCESS_KEY_ID: 'key-id',
      S3_SECRET_ACCESS_KEY: 'key-secret',
      S3_FORCE_PATH_STYLE: true,
    });

    expect(service.s3).toEqual({
      endpoint: 'http://minio:9000',
      region: 'us-east-1',
      bucket: 'animal-helper-dev',
      accessKeyId: 'key-id',
      secretAccessKey: 'key-secret',
      forcePathStyle: true,
    });
  });

  it('expõe o SMTP, o token interno, o segredo de IP, o Nominatim e o webUrl', () => {
    const service = serviceWith({
      SMTP_URL: 'smtp://mailpit:1025',
      MAIL_FROM: 'Animal Helper <nao-responda@example.com>',
      INTERNAL_API_TOKEN: 'internal-token',
      IP_HASH_SECRET: 'ip-secret',
      NOMINATIM_URL: 'https://nominatim.example.com',
      NOMINATIM_USER_AGENT: 'animal-helper/0.1 (contato@example.com)',
      WEB_URL: 'http://localhost:3000',
    });

    expect(service.smtp).toEqual({
      url: 'smtp://mailpit:1025',
      from: 'Animal Helper <nao-responda@example.com>',
    });
    expect(service.internalApiToken).toBe('internal-token');
    expect(service.ipHashSecret).toBe('ip-secret');
    expect(service.nominatim).toEqual({
      url: 'https://nominatim.example.com',
      userAgent: 'animal-helper/0.1 (contato@example.com)',
    });
    expect(service.webUrl).toBe('http://localhost:3000');
  });

  describe('demo', () => {
    const DEMO_ENV: Partial<Env> = {
      DEMO_RETENTION_DAYS: 7,
      DEMO_MAX_NGOS: 30,
      DEMO_SIGNUPS_PER_IP_PER_DAY: 2,
      DEMO_MAX_ANIMALS_PER_NGO: 10,
      DEMO_MAX_IMAGES_PER_ANIMAL: 3,
      DEMO_MAX_UPLOAD_MB: 5,
      DEMO_MAX_STORAGE_MB: 500,
    };

    it('com DEMO_MODE=true usa os limites configurados (3 fotos, 5 MB)', () => {
      const { demo } = serviceWith({ ...DEMO_ENV, DEMO_MODE: true });

      expect(demo).toEqual({
        enabled: true,
        retentionDays: 7,
        maxNgos: 30,
        signupsPerIpPerDay: 2,
        maxAnimalsPerNgo: 10,
        maxImagesPerAnimal: 3,
        maxUploadMb: 5,
        maxStorageMb: 500,
      });
    });

    it('maxImagesPerAnimal é DEMO_MAX_IMAGES_PER_ANIMAL com a demo ligada', () => {
      const { demo } = serviceWith({
        ...DEMO_ENV,
        DEMO_MODE: true,
        DEMO_MAX_IMAGES_PER_ANIMAL: 2,
      });

      expect(demo.maxImagesPerAnimal).toBe(2);
    });

    it('maxUploadMb é DEMO_MAX_UPLOAD_MB com a demo ligada', () => {
      const { demo } = serviceWith({
        ...DEMO_ENV,
        DEMO_MODE: true,
        DEMO_MAX_UPLOAD_MB: 4,
      });

      expect(demo.maxUploadMb).toBe(4);
    });

    it('maxImagesPerAnimal é 8 com DEMO_MODE=false', () => {
      const { demo } = serviceWith({ ...DEMO_ENV, DEMO_MODE: false });

      expect(demo.enabled).toBe(false);
      expect(demo.maxImagesPerAnimal).toBe(8);
    });

    it('maxUploadMb é 10 com DEMO_MODE=false', () => {
      const { demo } = serviceWith({ ...DEMO_ENV, DEMO_MODE: false });

      expect(demo.maxUploadMb).toBe(10);
    });
  });

  describe('demo fechada (AD-008)', () => {
    const ACCOUNT: Partial<Env> = {
      DEMO_ACCOUNT_EMAIL: 'demo@animalhelper.example',
      DEMO_ACCOUNT_PASSWORD: 'Demo1234',
    };

    it('demoLocked segue DEMO_LOCKED', () => {
      expect(serviceWith({ DEMO_LOCKED: true }).demoLocked).toBe(true);
      expect(serviceWith({ DEMO_LOCKED: false }).demoLocked).toBe(false);
    });

    it('demoAccount traz as credenciais só com a demo fechada', () => {
      expect(
        serviceWith({ ...ACCOUNT, DEMO_LOCKED: true }).demoAccount,
      ).toEqual({ email: 'demo@animalhelper.example', password: 'Demo1234' });
      expect(
        serviceWith({ ...ACCOUNT, DEMO_LOCKED: false }).demoAccount,
      ).toBeNull();
    });

    it('smtp é null sem SMTP_URL (DEP-14)', () => {
      expect(serviceWith({ DEMO_LOCKED: true }).smtp).toBeNull();
    });
  });
});
