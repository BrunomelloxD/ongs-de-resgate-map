import { render, screen } from '@testing-library/react';
import { loadPinPicker, SignupSteps } from './signup-steps.client';

const recorded = vi.hoisted(() => ({ wizard: {} as Record<string, unknown> }));

vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicPinPicker() {
      return null;
    },
}));
vi.mock('@/features/location/client', () => ({
  lookupCep: vi.fn(),
  geocodeAddress: vi.fn(),
}));
vi.mock('@/features/ngo-account/client', () => ({
  AddressFields: (props: Record<string, unknown>) => {
    recorded.wizard['address'] = props;
    return <p>endereço {String(props['idPrefix'])}</p>;
  },
  HoursFields: (props: Record<string, unknown>) => (
    <p>horário {String(props['idPrefix'])}</p>
  ),
}));
vi.mock('../actions', () => ({ createAccount: vi.fn() }));
vi.mock('@/features/signup/client', () => ({
  SignupWizard: (props: {
    renderAddressFields: (slot: object) => React.ReactNode;
    renderHoursFields: (slot: object) => React.ReactNode;
  }) => {
    recorded.wizard = { ...props };
    return (
      <>
        {props.renderAddressFields({
          idPrefix: 'a',
          errors: {},
          values: {},
          onChange: vi.fn(),
        })}
        {props.renderHoursFields({
          idPrefix: 'h',
          errors: {},
          values: [],
          onChange: vi.fn(),
        })}
      </>
    );
  },
}));

describe('SignupSteps', () => {
  it('liga o assistente às actions e aos campos de endereço e horário de ngo-account', async () => {
    const { createAccount } = await import('../actions');
    const { lookupCep, geocodeAddress } =
      await import('@/features/location/client');

    render(
      <SignupSteps
        slug="endereco"
        maxUploadMb={5}
        tileUrl="http://tiles.test/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        demo={{ enabled: true, retentionDays: 7 }}
      />,
    );

    expect(screen.getByText('endereço a')).toBeVisible();
    expect(screen.getByText('horário h')).toBeVisible();
    expect(recorded.wizard).toMatchObject({
      slug: 'endereco',
      maxUploadMb: 5,
      demo: { enabled: true, retentionDays: 7 },
      createAccount,
    });
    expect(recorded.wizard['address']).toMatchObject({
      lookupCep,
      geocodeAddress,
      tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      PinPicker: expect.any(Function),
    });
  });

  it('PERF-01: o PinPicker vem do import dinâmico de components/ui', async () => {
    const { PinPicker } = await import('@/components/ui/pin-picker.client');

    await expect(loadPinPicker()).resolves.toBe(PinPicker);
  });
});
