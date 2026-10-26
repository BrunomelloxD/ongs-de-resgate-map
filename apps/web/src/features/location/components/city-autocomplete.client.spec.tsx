import { act, fireEvent, render, screen } from '@testing-library/react';
import { makeCity } from '../test-fixtures';
import type { City, LookupCepResult } from '../location.types';
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
    // T186: each option shows the name and "Cidade · UF", and is named by both lines.
    expect(screen.getAllByRole('option')).toEqual([
      screen.getByRole('option', { name: 'Vila Velha Cidade · ES' }),
      screen.getByRole('option', { name: 'Vilhena Cidade · RO' }),
    ]);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent(
      'Vila Velha Cidade · ES',
    );
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
    fireEvent.mouseDown(
      screen.getByRole('option', { name: 'Vila Velha Cidade · ES' }),
    );
    fireEvent.click(
      screen.getByRole('option', { name: 'Vila Velha Cidade · ES' }),
    );

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
    expect(screen.getAllByRole('option')).toEqual([
      screen.getByRole('option', { name: 'Vila Rica Cidade · MT' }),
    ]);
  });
});

describe('CityAutocomplete com CEP (T186, figcraft "Cidade ou CEP")', () => {
  const ADDRESS = {
    street: 'Rua Domingos de Morais',
    district: 'Vila Mariana',
    city: 'São Paulo',
    uf: 'SP',
    lat: -23.5869,
    lng: -46.6347,
  };

  function setupCep(
    lookupCep: (cep: string) => Promise<LookupCepResult> = vi.fn(
      async (_cep: string) => ({ ok: true as const, address: ADDRESS }),
    ),
  ) {
    const onSelect = vi.fn();
    const onCep = vi.fn();
    const search = vi.fn(async () => [VILA_VELHA]);
    render(
      <CityAutocomplete
        onSelect={onSelect}
        onCep={onCep}
        search={search}
        lookupCep={lookupCep}
        submitLabel="Ver ONGs nesta região"
        extra={<button type="button">Tentar de novo</button>}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Cidade ou CEP' });
    const type = (value: string) =>
      fireEvent.change(input, { target: { value } });
    const submit = () =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Ver ONGs nesta região' }),
      );
    return { input, type, submit, onSelect, onCep, search, lookupCep };
  }

  it('L-05: um campo só, com a dica "Ex.: Campinas ou 13010-000", o primário e o extra', () => {
    const { input } = setupCep();

    expect(input).toHaveAttribute('placeholder', 'Ex.: Campinas ou 13010-000');
    expect(
      screen.getByRole('button', { name: 'Ver ONGs nesta região' }),
    ).toHaveAttribute('type', 'submit');
    expect(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    ).toBeVisible();
  });

  it('LOC-09: os 8 números do CEP viram uma sugestão com o endereço; escolhê-la emite o ponto', async () => {
    const { input, type, onCep, search, lookupCep } = setupCep();

    type('04101000');
    expect(input).toHaveValue('04101-000');
    await advance(0);

    expect(lookupCep).toHaveBeenCalledWith('04101-000');
    expect(search).not.toHaveBeenCalled();
    const option = screen.getByRole('option', {
      name: '04101-000 Vila Mariana, São Paulo – SP',
    });
    expect(option).toHaveTextContent('Vila Mariana, São Paulo – SP');
    fireEvent.click(option);

    expect(onCep).toHaveBeenCalledWith({ ...ADDRESS, cep: '04101-000' });
  });

  it('LOC-09: seta para baixo + Enter na sugestão do CEP emite o ponto', async () => {
    const { input, type, onCep } = setupCep();

    type('04101000');
    await advance(0);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCep).toHaveBeenCalledWith({ ...ADDRESS, cep: '04101-000' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('LOC-09: com o CEP encontrado, "Ver ONGs nesta região" emite o ponto', async () => {
    const { type, submit, onCep } = setupCep();

    type('04101-000');
    await advance(0);
    submit();

    expect(onCep).toHaveBeenCalledWith({ ...ADDRESS, cep: '04101-000' });
  });

  it('LOC-10/LOC-11: a mensagem da busca do CEP fica no campo', async () => {
    const message =
      'CEP não encontrado. Confira os números ou busque pela cidade.';
    const { input, type, submit, onCep } = setupCep(
      vi.fn(async () => ({ ok: false as const, error: message })),
    );

    type('00000000');
    await advance(0);
    submit();

    expect(screen.getByText(message)).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(message);
    expect(onCep).not.toHaveBeenCalled();
  });

  it('CEP com menos de 8 números: "Digite os 8 números do CEP." ao enviar', () => {
    const { type, submit, lookupCep } = setupCep();

    type('04101');
    submit();

    expect(screen.getByText('Digite os 8 números do CEP.')).toBeVisible();
    expect(lookupCep).not.toHaveBeenCalled();
  });

  it('texto sem escolher uma cidade, ou vazio, pede a escolha ao enviar', async () => {
    const { type, submit, onSelect } = setupCep();

    submit();
    expect(screen.getByText('Digite uma cidade ou um CEP.')).toBeVisible();

    type('vila');
    await advance(250);
    submit();
    expect(screen.getByText('Escolha uma cidade da lista.')).toBeVisible();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('com uma cidade destacada, "Ver ONGs nesta região" emite o município', async () => {
    const { input, type, submit, onSelect } = setupCep();

    type('vila');
    await advance(250);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    submit();

    expect(onSelect).toHaveBeenCalledWith(VILA_VELHA);
  });

  it('enquanto busca o CEP, o primário fica desabilitado com "Buscando…" e uma resposta antiga é descartada', async () => {
    let finish: (value: LookupCepResult) => void = () => {};
    const { type, onCep } = setupCep(
      vi.fn(
        () => new Promise<LookupCepResult>((resolve) => (finish = resolve)),
      ),
    );

    type('04101000');
    expect(screen.getByRole('button', { name: 'Buscando…' })).toBeDisabled();
    type('0410100');
    finish({ ok: true, address: ADDRESS });
    await advance(0);

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'Ver ONGs nesta região' }),
    ).toBeEnabled();
    expect(onCep).not.toHaveBeenCalled();
  });

  it('CEP sem coordenada mostra a mensagem do LOC-11', async () => {
    const { type } = setupCep(
      vi.fn(async () => ({
        ok: true as const,
        address: { ...ADDRESS, lat: null, lng: null },
      })),
    );

    type('04101000');
    await advance(0);

    expect(
      screen.getByText(
        'Não conseguimos buscar o CEP agora. Tente pela cidade.',
      ),
    ).toBeVisible();
  });
});

describe('CityAutocomplete na barra do mapa (T187, figcraft "Search/Map")', () => {
  it('M-01: rótulo próprio escondido, pílula com o botão no fim e sugestões sobre o mapa', async () => {
    render(
      <CityAutocomplete
        onSelect={vi.fn()}
        search={vi.fn(async () => [])}
        label="Buscar outra região"
        variant="bar"
        trailing={<button type="button">Filtros</button>}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Buscar outra região' });

    expect(screen.getByText('Buscar outra região')).toHaveClass('sr-only');
    expect(input.parentElement).toHaveClass('rounded-full', 'shadow-card');
    expect(input.parentElement).toContainElement(
      screen.getByRole('button', { name: 'Filtros' }),
    );
    expect(screen.getByRole('listbox', { hidden: true })).toHaveClass(
      'absolute',
      'top-full',
    );

    fireEvent.change(input, { target: { value: 'xyz' } });
    await advance(250);
    // Over the map, the message gets a card.
    expect(
      screen.getByText('Nenhuma cidade encontrada.').parentElement,
    ).toHaveClass('bg-surface');
  });
});
