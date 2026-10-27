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
      DEMO_LOCKED: false,
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

  describe('demo fechada (DEMO_LOCKED, AD-008)', () => {
    const { SMTP_URL: _url, MAIL_FROM: _from, ...WITHOUT_SMTP } = REQUIRED;
    const ACCOUNT = {
      DEMO_ACCOUNT_EMAIL: 'demo@animalhelper.example',
      DEMO_ACCOUNT_PASSWORD: 'Demo1234',
    };

    it('DEMO_LOCKED é false quando ausente', () => {
      expect(validateEnv(REQUIRED).DEMO_LOCKED).toBe(false);
    });

    it('com DEMO_LOCKED=true sobe sem SMTP_URL e sem MAIL_FROM (DEP-14)', () => {
      const env = validateEnv({
        ...WITHOUT_SMTP,
        ...ACCOUNT,
        DEMO_LOCKED: 'true',
      });

      expect(env.DEMO_LOCKED).toBe(true);
      expect(env.SMTP_URL).toBeUndefined();
      expect(env.MAIL_FROM).toBeUndefined();
      expect(env.DEMO_ACCOUNT_EMAIL).toBe('demo@animalhelper.example');
      expect(env.DEMO_ACCOUNT_PASSWORD).toBe('Demo1234');
    });

    it.each(['SMTP_URL', 'MAIL_FROM'])(
      'sem DEMO_LOCKED, %s continua obrigatória (DEP-15)',
      (name) => {
        const { [name as 'SMTP_URL']: _omitted, ...rest } = REQUIRED;

        expect(() => validateEnv({ ...rest, DEMO_LOCKED: 'false' })).toThrow(
          new RegExp(name),
        );
      },
    );

    it.each(['DEMO_ACCOUNT_EMAIL', 'DEMO_ACCOUNT_PASSWORD'])(
      'com DEMO_LOCKED=true, %s é obrigatória',
      (name) => {
        const { [name as 'DEMO_ACCOUNT_EMAIL']: _omitted, ...account } =
          ACCOUNT;

        expect(() =>
          validateEnv({ ...WITHOUT_SMTP, ...account, DEMO_LOCKED: 'true' }),
        ).toThrow(new RegExp(name));
      },
    );

    it.each(['sim', '1', ''])(
      'DEMO_LOCKED=%j é recusado e o erro cita o nome (DEP-16)',
      (value) => {
        expect(() =>
          validateEnv({ ...REQUIRED, ...ACCOUNT, DEMO_LOCKED: value }),
        ).toThrow(/DEMO_LOCKED/);
      },
    );

    it('DEMO_ACCOUNT_EMAIL precisa ser um e-mail', () => {
      expect(() =>
        validateEnv({
          ...WITHOUT_SMTP,
          ...ACCOUNT,
          DEMO_ACCOUNT_EMAIL: 'não é e-mail',
          DEMO_LOCKED: 'true',
        }),
      ).toThrow(/DEMO_ACCOUNT_EMAIL/);
    });

    it('DEMO_ACCOUNT_PASSWORD com menos de 8 caracteres é recusada', () => {
      expect(() =>
        validateEnv({
          ...WITHOUT_SMTP,
          ...ACCOUNT,
          DEMO_ACCOUNT_PASSWORD: 'curta',
          DEMO_LOCKED: 'true',
        }),
      ).toThrow(/DEMO_ACCOUNT_PASSWORD/);
    });
  });
});
