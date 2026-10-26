import { fireEvent, render, screen } from '@testing-library/react';
import { ChipSelect } from './chip-select';

const OPTIONS = [
  { value: '5', label: 'Até 5 km' },
  { value: '10', label: 'Até 10 km' },
  { value: '25', label: 'Até 25 km' },
];

describe('ChipSelect', () => {
  it('mostra a opção escolhida com o ▾, e o select nativo tem o nome e as opções', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ChipSelect
        label="Distância"
        value="5"
        options={OPTIONS}
        onValueChange={onValueChange}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Distância' });

    expect(
      container.querySelector('[data-slot="chip-select"]'),
    ).toHaveTextContent('Até 5 km');
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(select).toHaveValue('5');
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['Até 5 km', 'Até 10 km', 'Até 25 km']);

    fireEvent.change(select, { target: { value: '25' } });
    expect(onValueChange).toHaveBeenCalledWith('25');
  });

  it('com `display`, mostra o rótulo; `active` preenche o chip', () => {
    const { container } = render(
      <ChipSelect
        label="Espécie"
        value=""
        display="Espécie"
        options={[{ value: '', label: 'Todas' }]}
        onValueChange={vi.fn()}
        active
        className="extra"
      />,
    );
    const chip = container.querySelector('[data-slot="chip-select"]')!;

    expect(chip).toHaveTextContent('Espécie');
    expect(chip).toHaveAttribute('data-active', 'true');
    expect(chip).toHaveClass('bg-brand-deep', 'extra');
  });

  it('uma opção que não existe não mostra texto', () => {
    const { container } = render(
      <ChipSelect
        label="Distância"
        value="7"
        options={OPTIONS}
        onValueChange={vi.fn()}
      />,
    );

    expect(
      container.querySelector('[data-slot="chip-select"] > span'),
    ).toBeEmptyDOMElement();
  });
});
