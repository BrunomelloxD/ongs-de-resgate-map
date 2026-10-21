import { render, screen } from '@testing-library/react';
import { SignupStepContent } from './signup-step-content';

const getDemoInfo = vi.hoisted(() => vi.fn());
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
vi.mock('@/features/demo', () => ({ getDemoInfo }));
vi.mock('./signup-steps.client', () => ({
  SignupSteps: (props: object) => <pre>{JSON.stringify(props)}</pre>,
}));

describe('SignupStepContent', () => {
  it('passa a etapa, o limite de upload, os tiles e a demo da api', async () => {
    getDemoInfo.mockResolvedValue({
      enabled: true,
      retentionDays: 7,
      quotas: { maxNgos: 30 },
    });

    render(await SignupStepContent({ slug: 'endereco' }));

    expect(JSON.parse(screen.getByText(/slug/).textContent!)).toEqual({
      slug: 'endereco',
      maxUploadMb: 5,
      tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      demo: { enabled: true, retentionDays: 7 },
    });
  });

  it('a api fora do ar cai no error.tsx da rota', async () => {
    getDemoInfo.mockRejectedValue(new Error('GET /demo failed.'));

    await expect(SignupStepContent({ slug: 'revisao' })).rejects.toThrow(
      'GET /demo failed.',
    );
  });
});
