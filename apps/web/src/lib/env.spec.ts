import { getEnv } from './env';

const TOKEN = 'dev-internal-token-0000000000000000000000';
const VALID = {
  API_URL: 'http://api:3333',
  INTERNAL_API_TOKEN: TOKEN,
  PUBLIC_WEB_URL: 'http://localhost:3000',
  TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '© OpenStreetMap contributors',
  MAX_UPLOAD_MB: '5',
};

describe('getEnv', () => {
  it('retorna as variáveis válidas, com MAX_UPLOAD_MB numérico', () => {
    expect(getEnv(VALID)).toEqual({ ...VALID, MAX_UPLOAD_MB: 5 });
  });

  it('lê do process.env por padrão', () => {
    expect(getEnv().API_URL).toBe('http://api.test');
  });

  it.each(Object.keys(VALID))(
    'falha citando %s quando ela está ausente',
    (name) => {
      const source: Record<string, string | undefined> = { ...VALID };
      delete source[name];

      expect(() => getEnv(source)).toThrow(
        new RegExp(`Variáveis de ambiente inválidas:[\\s\\S]*${name}`),
      );
    },
  );

  it.each([
    ['API_URL', 'nao-e-url'],
    ['INTERNAL_API_TOKEN', 'curto'],
    ['PUBLIC_WEB_URL', 'nao-e-url'],
    ['TILE_URL', 'nao-e-url'],
    ['TILE_ATTRIBUTION', ''],
    ['MAX_UPLOAD_MB', 'abc'],
    ['MAX_UPLOAD_MB', '0'],
    ['MAX_UPLOAD_MB', '2.5'],
  ])('falha citando %s com o valor %j, sem expor o valor', (name, value) => {
    let message = '';
    try {
      getEnv({ ...VALID, [name]: value });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(name);
    if (value.length > 3) expect(message).not.toContain(value);
  });

  it('não expõe o token válido em erro de outra variável', () => {
    let message = '';
    try {
      getEnv({ ...VALID, API_URL: 'nao-e-url' });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).not.toContain(TOKEN);
  });
});
