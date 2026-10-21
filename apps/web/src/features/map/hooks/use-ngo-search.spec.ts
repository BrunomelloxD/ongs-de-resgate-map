import { act, renderHook } from '@testing-library/react';
import type { Bbox } from '@/lib/geo';
import type { SearchNgos } from '../lib/fetch-ngos';
import type { MapSpecies, NgoSearchResponse } from '../map.types';
import { makeNgoPin } from '../test-fixtures';
import { useNgoSearch } from './use-ngo-search';

const AREA: Bbox = [-46.7051, -23.6049, -46.5951, -23.4951];
const MOVES: Bbox[] = [
  [-46.71, -23.61, -46.6, -23.5],
  [-46.73, -23.63, -46.62, -23.52],
  [-46.75, -23.65, -46.64, -23.54],
];
const FOUND: NgoSearchResponse = { items: [makeNgoPin()], truncated: false };

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

function setup(
  search: SearchNgos = vi.fn(async () => FOUND),
  initial: { bbox: Bbox | null; species: MapSpecies[] } = {
    bbox: AREA,
    species: [],
  },
) {
  const hook = renderHook(
    ({ bbox, species }) => useNgoSearch(bbox, species, search),
    { initialProps: initial },
  );
  return { ...hook, search: vi.mocked(search) };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNgoSearch', () => {
  it('MAP-17: 3 movimentos em 300 ms → 1 requisição, 400 ms depois do último', async () => {
    const { rerender, search } = setup(undefined, {
      bbox: MOVES[0]!,
      species: [],
    });

    await advance(150);
    rerender({ bbox: MOVES[1]!, species: [] });
    await advance(150);
    rerender({ bbox: MOVES[2]!, species: [] });
    await advance(399);
    expect(search).not.toHaveBeenCalled();

    await advance(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]![0].bbox).toEqual([
      -46.75, -23.65, -46.64, -23.54,
    ]);
  });

  it('SEC-01: manda só a bbox arredondada para fora com 2 casas e as espécies', async () => {
    const { search } = setup(undefined, { bbox: AREA, species: ['DOG'] });

    await advance(400);

    expect(search.mock.calls[0]![0]).toEqual({
      bbox: [-46.71, -23.61, -46.59, -23.49],
      species: ['DOG'],
    });
  });

  it('MAP-12: fica em loading até a resposta chegar; depois, ready com os itens', async () => {
    const { result } = setup();

    expect(result.current.status).toBe('loading');
    await advance(400);

    expect(result.current.status).toBe('ready');
    expect(result.current.items).toEqual(FOUND.items);
    expect(result.current.truncated).toBe(false);
  });

  it('MAP-13: zero ONGs → empty', async () => {
    const { result } = setup(
      vi.fn(async () => ({ items: [], truncated: false })),
    );

    await advance(400);

    expect(result.current.status).toBe('empty');
  });

  it('mais de 200 ONGs → truncated (Edge Cases)', async () => {
    const { result } = setup(
      vi.fn(async () => ({ ...FOUND, truncated: true })),
    );

    await advance(400);

    expect(result.current.truncated).toBe(true);
  });

  it('MAP-16: erro → error; retry() busca de novo', async () => {
    const search = vi
      .fn<SearchNgos>()
      .mockRejectedValueOnce(new Error('GET /map/ngos: 503'))
      .mockResolvedValueOnce(FOUND);
    const { result } = setup(search);

    await advance(400);
    expect(result.current.status).toBe('error');
    expect(result.current.items).toEqual([]);

    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await advance(400);

    expect(search).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('ready');
  });

  it('cancela a requisição anterior e ignora a resposta dela', async () => {
    let answerFirst: (value: NgoSearchResponse) => void = () => {};
    const search = vi
      .fn<SearchNgos>()
      .mockImplementationOnce(
        () => new Promise((resolve) => (answerFirst = resolve)),
      )
      .mockResolvedValueOnce({ items: [], truncated: false });
    const { result, rerender } = setup(search, {
      bbox: MOVES[0]!,
      species: [],
    });

    await advance(400);
    rerender({ bbox: MOVES[1]!, species: [] });
    expect(search.mock.calls[0]![1].aborted).toBe(true);

    await advance(400);
    await act(async () => answerFirst(FOUND));

    expect(result.current.status).toBe('empty');
  });

  it('sem área (centro desconhecido) → não busca', async () => {
    const { search } = setup(undefined, { bbox: null, species: [] });

    await advance(1000);

    expect(search).not.toHaveBeenCalled();
  });
});
