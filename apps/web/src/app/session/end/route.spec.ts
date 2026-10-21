import { GET } from './route';

const store = vi.hoisted(() => ({ delete: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => store,
  headers: async () => new Headers(),
}));

describe('GET /session/end', () => {
  it('apaga o cookie ah_session e redireciona 307 para /entrar sem cache', async () => {
    const response = await GET();

    expect(store.delete).toHaveBeenCalledWith('ah_session');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/entrar');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
