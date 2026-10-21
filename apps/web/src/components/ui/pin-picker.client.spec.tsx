import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinPicker, type PinPickerProps } from './pin-picker.client';

type Props = Record<string, unknown>;

const recorded = vi.hoisted(() => ({
  mapView: {} as Props,
  marker: {} as Props,
}));

vi.mock('./map-view.client', () => ({
  MapView: ({ children, ...props }: Props & { children: React.ReactNode }) => {
    recorded.mapView = props;
    return <div data-testid="map">{children}</div>;
  },
  pinIcon: (variant: string, label: string) => ({ variant, label }),
}));

vi.mock('react-leaflet', () => ({
  Marker: (props: Props) => {
    recorded.marker = props;
    return null;
  },
}));

const START: [number, number] = [-23.588, -46.634];

function renderPicker(props: Partial<PinPickerProps> = {}) {
  const onConfirmedChange = vi.fn();
  render(
    <PinPicker
      tileUrl="http://tiles.test/{z}/{x}/{y}.png"
      attribution="© OpenStreetMap contributors"
      position={START}
      onConfirmedChange={onConfirmedChange}
      {...props}
    />,
  );
  return onConfirmedChange;
}

function dragTo(lat: number, lng: number) {
  const { dragend } = recorded.marker['eventHandlers'] as {
    dragend: (e: unknown) => void;
  };
  act(() => dragend({ target: { getLatLng: () => ({ lat, lng }) } }));
}

const confirmButton = () =>
  screen.getByRole('button', { name: 'Confirmar localização' });

describe('PinPicker', () => {
  it('mostra o pino arrastável na posição sugerida, sobre o MapView com os tiles recebidos', () => {
    renderPicker();

    expect(recorded.marker['draggable']).toBe(true);
    expect(recorded.marker['position']).toEqual(START);
    expect(recorded.mapView['tileUrl']).toBe(
      'http://tiles.test/{z}/{x}/{y}.png',
    );
    expect(recorded.mapView['attribution']).toBe(
      '© OpenStreetMap contributors',
    );
    const [[south, west], [north, east]] = recorded.mapView[
      'bounds'
    ] as number[][];
    expect(south! < START[0] && START[0] < north!).toBe(true);
    expect(west! < START[1] && START[1] < east!).toBe(true);
  });

  it('confirmar sem arrastar emite a posição sugerida (SIGN-19)', async () => {
    const onConfirmedChange = renderPicker();

    await userEvent.click(confirmButton());

    expect(onConfirmedChange).toHaveBeenCalledExactlyOnceWith(START);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Localização confirmada.',
    );
    expect(confirmButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('arrastar e confirmar emite a posição arrastada (SIGN-21)', async () => {
    const onConfirmedChange = renderPicker();

    dragTo(-23.59, -46.635);
    await userEvent.click(confirmButton());

    expect(onConfirmedChange).toHaveBeenCalledExactlyOnceWith([
      -23.59, -46.635,
    ]);
    expect(recorded.marker['position']).toEqual([-23.59, -46.635]);
  });

  it('sem confirmar, nada é emitido e não há confirmação (SIGN-22)', () => {
    const onConfirmedChange = renderPicker();

    dragTo(-23.59, -46.635);

    expect(onConfirmedChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(confirmButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('mudar a posição depois de confirmar desfaz a confirmação (PROF-03)', async () => {
    const onConfirmedChange = renderPicker();
    await userEvent.click(confirmButton());

    dragTo(-23.6, -46.64);

    expect(onConfirmedChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(confirmButton()).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(confirmButton());
    expect(onConfirmedChange).toHaveBeenLastCalledWith([-23.6, -46.64]);
  });

  it('endereço não encontrado: pede para arrastar o pino (SIGN-20)', () => {
    renderPicker({ notFound: true });

    expect(screen.getByText('Arraste o pino até o local')).toBeVisible();
  });

  it('endereço encontrado: mostra a dica do design, sem o aviso', () => {
    renderPicker();

    expect(
      screen.getByText(
        'O pino está na entrada da ONG? Se não estiver, arraste o pino até o lugar certo.',
      ),
    ).toBeVisible();
    expect(screen.queryByText('Arraste o pino até o local')).toBeNull();
  });

  it('o botão tem alvo de 44 px e o pino, rótulo acessível', () => {
    renderPicker();

    expect(confirmButton().className).toContain('touch-target');
    expect(recorded.marker['icon']).toEqual({
      variant: 'selected',
      label: 'Pino da ONG, arraste até o local',
    });
    expect(recorded.mapView['label']).toBe('Mapa com o pino da ONG');
    expect((recorded.mapView['clusterLabel'] as (n: number) => string)(2)).toBe(
      '2 pinos',
    );
  });
});
