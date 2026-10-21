import { act, fireEvent, render, screen } from '@testing-library/react';
import { makeCity } from '../test-fixtures';
import type { City } from '../location.types';
import { CityAutocomplete } from './city-autocomplete.client';

const VILA_VELHA = makeCity({ id: 3205200, name: 'Vila Velha', uf: 'ES' });
const VILHENA = makeCity({ id: 1100304, name: 'Vilhena', uf: 'RO' });
const VILA_RICA = makeCity({ id: 5108600, name: 'Vila Rica', uf: 'MT' });

type Search = (q: string, signal: AbortSignal) => Promise<City[]>;

// fireEvent instead of user-event: Testing Library's async wrapper only
// advances Jest's fake timers, so user-event hangs on Vitest's.
function setup(search: Search = vi.fn(async () => [VILA_VELHA, VILHENA])) {
  const onSelect = vi.fn();
  render(<CityAutocomplete onSelect={onSelect} search={search} />);
  const input = screen.getByRole('combobox', { name: 'Cidade' });
  const type = (value: string) =>
    fireEvent.change(input, { target: { value } });
  const press = (...keys: string[]) =>
    keys.forEach((key) => fireEvent.keyDown(input, { key }));
  return { input, type, press, onSelect, search };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CityAutocomplete', () => {
  it('LOC-07: "vil" dispara uma busca 250 ms depois da última tecla', async () => {
    const { input, type, search } = setup();

    type('v');
    type('vi');
    type('vil');
    await advance(249);
    expect(search).not.toHaveBeenCalled();

    await advance(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('vil', expect.any(AbortSignal));
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['Vila Velha, ES', 'Vilhena, RO']);
  });

  it('LOC-07: "vi" (menos de 3 caracteres) não busca', async () => {
    const { input, type, search } = setup();

    type('vi');
    await advance(1000);

    expect(search).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('LOC-07: mostra no máximo 5 sugestões', async () => {
    const six = Array.from({ length: 6 }, (_, i) =>
      makeCity({ id: i + 1, name: `São ${i + 1}` }),
    );
    const { type } = setup(vi.fn(async () => six));

    type('sao');
    await advance(250);

    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('LOC-08: seta para baixo + Enter emite o município destacado', async () => {
    const { input, type, press, onSelect } = setup();

    type('vil');
    await advance(250);
    press('ArrowDown', 'ArrowDown');
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      screen.getAllByRole('option')[1]!.id,
    );
    expect(screen.getAllByRole('option')[1]).toHaveAttribute(
      'aria-selected',
      'true',
    );
    press('Enter');

    expect(onSelect).toHaveBeenCalledWith(VILHENA);
    expect(input).toHaveValue('Vilhena – RO');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('as setas dão a volta na lista nos dois sentidos', async () => {
    const { type, press, onSelect } = setup(
      vi.fn(async () => [VILA_VELHA, VILHENA, VILA_RICA]),
    );

    type('vil');
    await advance(250);
    press('ArrowUp', 'Enter');
    expect(onSelect).toHaveBeenLastCalledWith(VILA_RICA);

    type('vila');
    await advance(250);
    press('ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');
    // 0 → wraps up to 2 → 1.
    press('ArrowUp', 'ArrowUp', 'Enter');
    expect(onSelect).toHaveBeenLastCalledWith(VILHENA);
  });

  it('Enter sem item destacado não emite nada', async () => {
    const { type, press, onSelect } = setup();

    type('vil');
    await advance(250);
    press('Enter');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('LOC-08: clicar numa sugestão emite o município', async () => {
    const { input, type, onSelect } = setup();

    type('vil');
    await advance(250);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Vila Velha, ES' }));
    fireEvent.click(screen.getByRole('option', { name: 'Vila Velha, ES' }));

    expect(onSelect).toHaveBeenCalledWith(VILA_VELHA);
    expect(input).toHaveValue('Vila Velha – ES');
  });

  it('Esc fecha a lista e as setas não fazem nada com ela fechada', async () => {
    const { input, type, press, onSelect } = setup();

    type('vil');
    await advance(250);
    press('Escape');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    press('ArrowDown', 'Enter');
    expect(onSelect).not.toHaveBeenCalled();
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('apagar até menos de 3 caracteres fecha a lista', async () => {
    const { input, type } = setup();

    type('vil');
    await advance(250);
    type('vi');

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('sem resultado, avisa que nenhuma cidade foi encontrada', async () => {
    const { input, type } = setup(vi.fn(async () => []));

    type('xyz');
    await advance(250);

    expect(screen.getByText('Nenhuma cidade encontrada.')).toBeVisible();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('falha na busca mostra o erro', async () => {
    const { type } = setup(
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );

    type('vil');
    await advance(250);

    expect(
      screen.getByText(
        'Não conseguimos buscar as cidades agora. Tente pelo CEP.',
      ),
    ).toBeVisible();
  });

  it('descarta a resposta de um texto antigo e cancela a busca dele', async () => {
    let resolveOld: (cities: City[]) => void = () => {};
    const search = vi
      .fn<Search>()
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveOld = resolve)),
      )
      .mockImplementationOnce(async () => [VILA_RICA]);
    const { type } = setup(search);

    type('vil');
    await advance(250);
    const oldSignal = search.mock.calls[0]![1];
    type('vila');
    expect(oldSignal.aborted).toBe(true);

    await act(async () => resolveOld([VILA_VELHA]));
    expect(screen.queryAllByRole('option')).toHaveLength(0);

    await advance(250);
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['Vila Rica, MT']);
  });
});
