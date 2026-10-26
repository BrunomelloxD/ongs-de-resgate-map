import { render, screen } from '@testing-library/react';
import type { CityAutocompleteProps } from '@/features/location/client';
import { MapPlaceSearch } from './map-place-search.client';

const recorded = vi.hoisted(() => ({
  props: undefined as unknown as CityAutocompleteProps,
}));

vi.mock('@/features/location/client', () => ({
  lookupCep: vi.fn(),
  CityAutocomplete: (props: CityAutocompleteProps) => {
    recorded.props = props;
    return <p>{props.label}</p>;
  },
}));

describe('MapPlaceSearch', () => {
  it('liga a busca "Cidade ou CEP" da localização ao mapa: cidade e CEP viram o lugar escolhido', async () => {
    const { lookupCep } = await import('@/features/location/client');
    const onPlace = vi.fn();

    render(
      <MapPlaceSearch
        label="Buscar outra região"
        variant="bar"
        onPlace={onPlace}
      />,
    );

    expect(screen.getByText('Buscar outra região')).toBeInTheDocument();
    expect(recorded.props.variant).toBe('bar');
    expect(recorded.props.lookupCep).toBe(lookupCep);
    expect(recorded.props.onSelect).toBe(onPlace);
    expect(recorded.props.onCep).toBe(onPlace);
  });
});
