import { render, screen } from '@testing-library/react';
import { SignupStepContent } from './signup-step-content';

const getDemoInfo = vi.hoisted(() => vi.fn());
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
vi.mock('@/features/demo', () => ({
  getDemoInfo,
  DemoLockedNotice: () => <p role="status">Indisponível na demo.</p>,
}));
vi.mock('./signup-steps.client', () => ({
  SignupSteps: (props: object) => <pre>{JSON.stringify(props)}</pre>,
}));

describe('SignupStepContent', () => {
  it('passa a etapa, o limite de upload, os tiles e a demo da api', async () => {
    getDemoInfo.mockResolvedValue({
      enabled: true,
      retentionDays: 7,
      quotas: { maxNgos: 30 },
      locked: false,
    });

    render(await SignupStepContent({ slug: 'endereco' }));

    expect(JSON.parse(screen.getByText(/slug/).textContent!)).toEqual({
      slug: 'endereco',
      maxUploadMb: 5,
      tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      demo: { enabled: true, retentionDays: 7, locked: false },
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('demo fechada: mostra o aviso e repassa locked às etapas (DEP-19)', async () => {
    getDemoInfo.mockResolvedValue({
      enabled: true,
      retentionDays: 7,
      quotas: { maxNgos: 30 },
      locked: true,
    });

    render(await SignupStepContent({ slug: 'sobre' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Indisponível na demo.',
    );
    expect(JSON.parse(screen.getByText(/slug/).textContent!).demo).toEqual({
      enabled: true,
      retentionDays: 7,
      locked: true,
    });
  });

  it('a api fora do ar cai no error.tsx da rota', async () => {
    getDemoInfo.mockRejectedValue(new Error('GET /demo failed.'));

    await expect(SignupStepContent({ slug: 'revisao' })).rejects.toThrow(
      'GET /demo failed.',
    );
  });
});
