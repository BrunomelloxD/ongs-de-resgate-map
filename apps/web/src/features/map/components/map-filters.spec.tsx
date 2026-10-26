import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  DEFAULT_FILTERS,
  MapFilters,
  type MapFilterValues,
} from './map-filters';

function setup(initial: MapFilterValues = DEFAULT_FILTERS) {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <MapFilters
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }
  render(<Harness />);
  const chip = (name: string) => screen.getByRole('button', { name });
  // T188 (M-04): the radius is a dropdown chip, a native select named "Distância".
  const radius = () => screen.getByRole('combobox', { name: 'Distância' });
  return { onChange, chip, radius, last: () => onChange.mock.lastCall![0] };
}

describe('MapFilters', () => {
  it('começa no padrão: tudo desligado e raio de 5 km', () => {
    const { chip, radius } = setup();

    expect(chip('Aberta agora')).toHaveAttribute('aria-pressed', 'false');
    expect(radius()).toHaveValue('5');
    expect(radius().closest('[data-slot="chip-select"]')).toHaveTextContent(
      'Até 5 km',
    );
    expect(chip('Com cães')).toHaveAttribute('aria-pressed', 'false');
    expect(chip('Com gatos')).toHaveAttribute('aria-pressed', 'false');
  });

  it('MAPF-01: "Aberta agora" liga e desliga', async () => {
    const { chip, last } = setup();

    await userEvent.click(chip('Aberta agora'));
    expect(last()).toEqual({ ...DEFAULT_FILTERS, openNow: true });
    await userEvent.click(chip('Aberta agora'));
    expect(last()).toEqual(DEFAULT_FILTERS);
  });

  it('MAPF-02: escolher 25 km emite radiusKm 25; o dropdown oferece só 5, 10 e 25 km', async () => {
    const { radius, last } = setup();

    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['Até 5 km', 'Até 10 km', 'Até 25 km']);
    await userEvent.selectOptions(radius(), '25');
    expect(last().radiusKm).toBe(25);
    expect(radius()).toHaveValue('25');
    expect(radius().closest('[data-slot="chip-select"]')).toHaveTextContent(
      'Até 25 km',
    );
  });

  it('M-04: os filtros ficam numa linha só, sem rótulos de grupo, e "Limpar filtros" só aparece com um filtro ligado', async () => {
    const { chip, container } = { ...setup(), container: document.body };
    const row = container.querySelector('[data-slot="map-filters-row"]')!;

    expect(row.children).toHaveLength(4);
    expect(row).toHaveClass('overflow-x-auto', 'lg:flex-wrap');
    expect(screen.queryByText('Animais')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Limpar filtros' }),
    ).not.toBeInTheDocument();

    await userEvent.click(chip('Com cães'));
    expect(
      screen.getByRole('button', { name: 'Limpar filtros' }),
    ).toBeInTheDocument();
  });

  it('MAPF-03: ligar "Com cães" e "Com gatos" emite species: [DOG, CAT]', async () => {
    const { chip, last } = setup();

    await userEvent.click(chip('Com cães'));
    expect(last().species).toEqual(['DOG']);
    await userEvent.click(chip('Com gatos'));
    expect(last().species).toEqual(['DOG', 'CAT']);
    await userEvent.click(chip('Com cães'));
    expect(last().species).toEqual(['CAT']);
  });

  it('MAPF-04: "Limpar filtros" volta ao padrão', async () => {
    const { chip, last } = setup({
      openNow: true,
      radiusKm: 10,
      species: ['DOG', 'CAT'],
    });

    await userEvent.click(chip('Limpar filtros'));

    expect(last()).toEqual({ openNow: false, radiusKm: 5, species: [] });
    expect(chip('Aberta agora')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('combobox', { name: 'Distância' })).toHaveValue(
      '5',
    );
  });
});
