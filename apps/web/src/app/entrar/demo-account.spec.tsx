import { render, screen } from '@testing-library/react';
import { DemoAccount } from './demo-account';

const getDemoInfo = vi.hoisted(() => vi.fn());
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
vi.mock('@/features/demo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/demo')>()),
  getDemoInfo,
}));

describe('DemoAccount (/entrar)', () => {
  it('com a demo fechada exibe o e-mail e a senha da conta demo (DEP-18)', async () => {
    getDemoInfo.mockResolvedValue({
      locked: true,
      account: { email: 'demo@animalhelper.example', password: 'Demo1234' },
    });

    render(await DemoAccount());

    expect(screen.getByText('demo@animalhelper.example')).toBeInTheDocument();
    expect(screen.getByText('Demo1234')).toBeInTheDocument();
  });

  it('com a demo aberta não renderiza nada (DEP-23)', async () => {
    getDemoInfo.mockResolvedValue({ locked: false, account: null });

    expect(await DemoAccount()).toBeNull();
  });
});
