import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveRegion } from '@/components/ui/live-region.client';
import type { ToggleAvailability } from '../dashboard.types';
import { makeMyAnimal } from '../test-fixtures';
import { AnimalRow } from './animal-row.client';

const SAVE_ERROR = 'Não foi possível salvar. Tente de novo.';

function renderRow(
  onToggle: ToggleAvailability,
  animal = makeMyAnimal({ name: 'Mel', available: true }),
) {
  const utils = render(
    <LiveRegion>
      <ul>
        <AnimalRow animal={animal} onToggle={onToggle} />
      </ul>
    </LiveRegion>,
  );
  return {
    ...utils,
    toggle: () =>
      screen.getByRole('switch', {
        name: `Disponível para adoção: ${animal.name}`,
      }),
  };
}

describe('AnimalRow', () => {
  it('DASH-01: mostra a capa, o nome, espécie, sexo, porte e idade, e o link de edição', () => {
    const animal = makeMyAnimal({
      id: 'a0000000-0000-4000-8000-000000000009',
      name: 'Caramelo',
      species: 'DOG',
      sex: 'MALE',
      size: 'MEDIUM',
      ageValue: 3,
      ageUnit: 'YEARS',
    });
    renderRow(vi.fn(), animal);

    expect(
      screen.getByRole('img', { name: animal.images[0]!.alt }),
    ).toHaveAttribute('src', animal.images[0]!.thumbUrl);
    expect(
      screen.getByRole('heading', { name: 'Caramelo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Cão · Macho · Médio · Cerca de 3 anos'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Editar Caramelo' }),
    ).toHaveAttribute(
      'href',
      '/painel/animais/a0000000-0000-4000-8000-000000000009',
    );
  });

  it('PERF-02/T175: a capa de 64 px tem srcset com as 3 variantes, width, height e lazy', () => {
    const animal = makeMyAnimal();
    renderRow(vi.fn(), animal);
    const [cover] = animal.images;
    const img = screen.getByRole('img', { name: cover!.alt });

    expect(img).toHaveAttribute(
      'srcset',
      `${cover!.thumbUrl} 160w, ${cover!.mediumUrl} 600w, ${cover!.url} 1200w`,
    );
    expect(img).toHaveAttribute('sizes', '64px');
    expect(img).toHaveAttribute('width', '64');
    expect(img).toHaveAttribute('height', '64');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('sem foto mostra o marcador no lugar da capa', () => {
    renderRow(vi.fn(), makeMyAnimal({ images: [] }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('A11Y-07: role="switch" com o aria-label exato e o estado atual', () => {
    const { toggle } = renderRow(
      vi.fn(),
      makeMyAnimal({ name: 'Nina', available: false }),
    );

    expect(toggle()).toHaveAttribute('aria-checked', 'false');
  });

  it('DASH-02: desligar salva na hora, mantém desligado e anuncia "{nome} agora está indisponível."', async () => {
    const onToggle = vi.fn<ToggleAvailability>(async () => ({ ok: true }));
    const { toggle } = renderRow(onToggle);

    await userEvent.click(toggle());

    expect(onToggle).toHaveBeenCalledWith(makeMyAnimal().id, false);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Mel agora está indisponível.',
      ),
    );
    expect(toggle()).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByText(SAVE_ERROR)).not.toBeInTheDocument();
  });

  it('DASH-02: ligar anuncia "{nome} agora está disponível."', async () => {
    const { toggle } = renderRow(
      async () => ({ ok: true }),
      makeMyAnimal({ name: 'Nina', available: false }),
    );

    await userEvent.click(toggle());

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Nina agora está disponível.',
      ),
    );
    expect(toggle()).toHaveAttribute('aria-checked', 'true');
  });

  it('o switch muda antes da resposta da api (otimista)', async () => {
    let answer: (result: { ok: boolean }) => void = () => undefined;
    const { toggle } = renderRow(
      () => new Promise((resolve) => (answer = resolve)),
    );

    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    // React entangles pending transitions: settle this one before the next test.
    answer({ ok: true });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Mel agora está indisponível.',
      ),
    );
  });

  it('DASH-03: falha reverte o switch, mostra e anuncia a mensagem exata', async () => {
    const { toggle } = renderRow(async () => ({ ok: false }));

    await userEvent.click(toggle());

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(SAVE_ERROR),
    );
    await waitFor(() =>
      expect(toggle()).toHaveAttribute('aria-checked', 'true'),
    );
    expect(screen.getAllByText(SAVE_ERROR)).toHaveLength(2);
  });

  it('DASH-03: requisição perdida (a action rejeita) também reverte', async () => {
    const { toggle } = renderRow(async () => {
      throw new Error('network');
    });

    await userEvent.click(toggle());

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(SAVE_ERROR),
    );
    await waitFor(() =>
      expect(toggle()).toHaveAttribute('aria-checked', 'true'),
    );
  });

  it('DASH-03: tentar de novo com sucesso tira a mensagem de erro', async () => {
    const onToggle = vi
      .fn<ToggleAvailability>()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const { toggle } = renderRow(onToggle);

    await userEvent.click(toggle());
    await waitFor(() =>
      expect(screen.getAllByText(SAVE_ERROR)).toHaveLength(2),
    );
    await waitFor(() =>
      expect(toggle()).toHaveAttribute('aria-checked', 'true'),
    );
    await userEvent.click(toggle());

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Mel agora está indisponível.',
      ),
    );
    expect(screen.queryByText(SAVE_ERROR)).not.toBeInTheDocument();
  });

  it('um valor novo vindo do servidor (refresh) passa a valer', () => {
    const { rerender, toggle } = renderRow(vi.fn());

    rerender(
      <LiveRegion>
        <ul>
          <AnimalRow
            animal={makeMyAnimal({ name: 'Mel', available: false })}
            onToggle={vi.fn()}
          />
        </ul>
      </LiveRegion>,
    );

    expect(toggle()).toHaveAttribute('aria-checked', 'false');
  });
});
