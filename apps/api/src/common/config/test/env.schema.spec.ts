import { validateEnv } from '../env.schema.js';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
const SECRET_32 = 'a'.repeat(32);

// Every variable without a default.
const REQUIRED = {
  DATABASE_URL,
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'animal-helper-dev',
  S3_ACCESS_KEY_ID: 'access-key-id',
  S3_SECRET_ACCESS_KEY: 'secret-access-key',
  SMTP_URL: 'smtp://localhost:1025',
  MAIL_FROM: 'Animal Helper <nao-responda@example.com>',
  WEB_URL: 'http://localhost:3000',
  INTERNAL_API_TOKEN: SECRET_32,
  IP_HASH_SECRET: SECRET_32.replace(/a/g, 'b'),
  NOMINATIM_USER_AGENT: 'animal-helper/0.1 (contato@example.com)',
};

describe('validateEnv', () => {
  it('aplica os valores padrão', () => {
    expect(validateEnv(REQUIRED)).toEqual({
      NODE_ENV: 'development',
      PORT: 3333,
      APP_NAME: 'api',
      LOG_LEVEL: 'info',
      CORS_ORIGIN: ['http://localhost:3000'],
      DATABASE_URL,
      THROTTLE_TTL: 60_000,
      THROTTLE_LIMIT: 60,
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'auto',
      S3_BUCKET: 'animal-helper-dev',
      S3_ACCESS_KEY_ID: 'access-key-id',
      S3_SECRET_ACCESS_KEY: 'secret-access-key',
      S3_FORCE_PATH_STYLE: false,
      SMTP_URL: 'smtp://localhost:1025',
      MAIL_FROM: 'Animal Helper <nao-responda@example.com>',
      WEB_URL: 'http://localhost:3000',
      INTERNAL_API_TOKEN: SECRET_32,
      IP_HASH_SECRET: 'b'.repeat(32),
      NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
      NOMINATIM_USER_AGENT: 'animal-helper/0.1 (contato@example.com)',
      DEMO_MODE: true,
      DEMO_RETENTION_DAYS: 7,
      DEMO_MAX_NGOS: 30,
      DEMO_SIGNUPS_PER_IP_PER_DAY: 2,
      DEMO_MAX_ANIMALS_PER_NGO: 10,
      DEMO_MAX_IMAGES_PER_ANIMAL: 3,
      DEMO_MAX_UPLOAD_MB: 5,
      DEMO_MAX_STORAGE_MB: 500,
    });
  });

  it('converte números e separa as origens do CORS', () => {
    const env = validateEnv({
      ...REQUIRED,
      PORT: '8080',
      CORS_ORIGIN: 'http://a.com, http://b.com',
    });

    expect(env.PORT).toBe(8080);
    expect(env.CORS_ORIGIN).toEqual(['http://a.com', 'http://b.com']);
  });

  it('falha com mensagem clara quando falta variável obrigatória', () => {
    expect(() => validateEnv({})).toThrow(
      /Variáveis de ambiente inválidas:[\s\S]*DATABASE_URL/,
    );
  });

  it('falha quando um valor é inválido', () => {
    expect(() => validateEnv({ ...REQUIRED, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  describe.each(Object.keys(REQUIRED))('%s obrigatória', (name) => {
    it('ausente: o erro cita o nome da variável', () => {
      const { [name as keyof typeof REQUIRED]: _omitted, ...rest } = REQUIRED;

      expect(() => validateEnv(rest)).toThrow(new RegExp(name));
    });
  });

  describe('variáveis DEMO_* (DEMO-21)', () => {
    const NUMERIC = [
      'DEMO_RETENTION_DAYS',
      'DEMO_MAX_NGOS',
      'DEMO_SIGNUPS_PER_IP_PER_DAY',
      'DEMO_MAX_ANIMALS_PER_NGO',
      'DEMO_MAX_IMAGES_PER_ANIMAL',
      'DEMO_MAX_UPLOAD_MB',
      'DEMO_MAX_STORAGE_MB',
    ];

    it.each(NUMERIC)('%s negativa faz o erro citar o nome', (name) => {
      expect(() => validateEnv({ ...REQUIRED, [name]: '-1' })).toThrow(
        new RegExp(name),
      );
    });

    it.each(NUMERIC)('%s com texto faz o erro citar o nome', (name) => {
      expect(() => validateEnv({ ...REQUIRED, [name]: 'muitos' })).toThrow(
        new RegExp(name),
      );
    });

    it.each(NUMERIC)('%s vazia faz o erro citar o nome', (name) => {
      expect(() => validateEnv({ ...REQUIRED, [name]: '' })).toThrow(
        new RegExp(name),
      );
    });

    it.each(NUMERIC.filter((name) => name !== 'DEMO_RETENTION_DAYS'))(
      '%s igual a zero é recusada (a cota precisa ser positiva)',
      (name) => {
        expect(() => validateEnv({ ...REQUIRED, [name]: '0' })).toThrow(
          new RegExp(name),
        );
      },
    );

    it('DEMO_RETENTION_DAYS aceita 0 (cadastro expira na hora)', () => {
      expect(
        validateEnv({ ...REQUIRED, DEMO_RETENTION_DAYS: '0' })
          .DEMO_RETENTION_DAYS,
      ).toBe(0);
    });

    it('DEMO_RETENTION_DAYS fracionária é recusada', () => {
      expect(() =>
        validateEnv({ ...REQUIRED, DEMO_RETENTION_DAYS: '1.5' }),
      ).toThrow(/DEMO_RETENTION_DAYS/);
    });

    it('lê os valores informados como números', () => {
      const env = validateEnv({
        ...REQUIRED,
        DEMO_RETENTION_DAYS: '14',
        DEMO_MAX_NGOS: '1',
        DEMO_SIGNUPS_PER_IP_PER_DAY: '4',
        DEMO_MAX_ANIMALS_PER_NGO: '12',
        DEMO_MAX_IMAGES_PER_ANIMAL: '2',
        DEMO_MAX_UPLOAD_MB: '6',
        DEMO_MAX_STORAGE_MB: '100',
      });

      expect(env).toMatchObject({
        DEMO_RETENTION_DAYS: 14,
        DEMO_MAX_NGOS: 1,
        DEMO_SIGNUPS_PER_IP_PER_DAY: 4,
        DEMO_MAX_ANIMALS_PER_NGO: 12,
        DEMO_MAX_IMAGES_PER_ANIMAL: 2,
        DEMO_MAX_UPLOAD_MB: 6,
        DEMO_MAX_STORAGE_MB: 100,
      });
    });

    it('DEMO_MODE é booleano: "true" e "false"', () => {
      expect(validateEnv({ ...REQUIRED, DEMO_MODE: 'true' }).DEMO_MODE).toBe(
        true,
      );
      expect(validateEnv({ ...REQUIRED, DEMO_MODE: 'false' }).DEMO_MODE).toBe(
        false,
      );
    });

    it.each(['sim', '1', ''])('DEMO_MODE=%j é recusado', (value) => {
      expect(() => validateEnv({ ...REQUIRED, DEMO_MODE: value })).toThrow(
        /DEMO_MODE/,
      );
    });
  });

  describe('outras variáveis novas', () => {
    it('S3_FORCE_PATH_STYLE é booleano', () => {
      expect(
        validateEnv({ ...REQUIRED, S3_FORCE_PATH_STYLE: 'true' })
          .S3_FORCE_PATH_STYLE,
      ).toBe(true);
      expect(() =>
        validateEnv({ ...REQUIRED, S3_FORCE_PATH_STYLE: 'talvez' }),
      ).toThrow(/S3_FORCE_PATH_STYLE/);
    });

    it.each(['S3_ENDPOINT', 'SMTP_URL', 'WEB_URL', 'NOMINATIM_URL'])(
      '%s precisa ser uma URL',
      (name) => {
        expect(() => validateEnv({ ...REQUIRED, [name]: 'não é url' })).toThrow(
          new RegExp(name),
        );
      },
    );
  });

  describe('segredos (SEC-08)', () => {
    const SECRETS = [
      'INTERNAL_API_TOKEN',
      'IP_HASH_SECRET',
      'S3_SECRET_ACCESS_KEY',
      'S3_ACCESS_KEY_ID',
    ];

    it.each(['INTERNAL_API_TOKEN', 'IP_HASH_SECRET'])(
      '%s curto demais é recusado sem repetir o valor no erro',
      (name) => {
        const leaked = 'valor-secreto-curto';
        let message = '';
        try {
          validateEnv({ ...REQUIRED, [name]: leaked });
        } catch (error) {
          message = (error as Error).message;
        }

        expect(message).toMatch(new RegExp(name));
        expect(message).not.toContain(leaked);
      },
    );

    it('o erro de outra variável não traz o valor de nenhum segredo', () => {
      const env = {
        ...REQUIRED,
        INTERNAL_API_TOKEN: 'token-super-secreto-0123456789-abcdef',
        IP_HASH_SECRET: 'hash-super-secreto-0123456789-abcdef-x',
        S3_SECRET_ACCESS_KEY: 'chave-super-secreta-do-bucket',
        S3_ACCESS_KEY_ID: 'id-super-secreto-do-bucket',
        DEMO_MAX_NGOS: 'muitos',
      };
      let message = '';
      try {
        validateEnv(env);
      } catch (error) {
        message = (error as Error).message;
      }

      expect(message).toMatch(/DEMO_MAX_NGOS/);
      for (const name of SECRETS) {
        expect(message).not.toContain(env[name as keyof typeof env]);
      }
    });
  });
});
