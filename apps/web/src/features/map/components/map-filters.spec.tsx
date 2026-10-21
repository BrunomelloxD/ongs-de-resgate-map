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
  return { onChange, chip, last: () => onChange.mock.lastCall![0] };
}

describe('MapFilters', () => {
  it('começa no padrão: tudo desligado e raio de 5 km', () => {
    const { chip } = setup();

    expect(chip('Aberta agora')).toHaveAttribute('aria-pressed', 'false');
    expect(chip('Até 5 km')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Até 10 km')).toHaveAttribute('aria-pressed', 'false');
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

  it('MAPF-02: escolher 25 km emite radiusKm 25; tocar o raio atual o mantém', async () => {
    const { chip, last } = setup();

    await userEvent.click(chip('Até 25 km'));
    expect(last().radiusKm).toBe(25);
    expect(chip('Até 25 km')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Até 5 km')).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(chip('Até 25 km'));
    expect(last().radiusKm).toBe(25);
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
    expect(chip('Até 5 km')).toHaveAttribute('aria-pressed', 'true');
  });
});
