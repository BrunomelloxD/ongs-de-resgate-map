import { render, screen } from '@testing-library/react';
import { getDemoInfo } from '../queries/get-demo-info';
import { makeDemoInfo, makeLockedDemoInfo } from '../test-fixtures';
import { DemoBannerContainer } from './demo-banner.container';

vi.mock('../queries/get-demo-info', () => ({ getDemoInfo: vi.fn() }));
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));

const mockedGetDemoInfo = vi.mocked(getDemoInfo);

describe('DemoBannerContainer', () => {
  it('demo ligada (DEMO-01): mostra a faixa com os dias de retenção', async () => {
    mockedGetDemoInfo.mockResolvedValue(makeDemoInfo({ retentionDays: 7 }));

    render(await DemoBannerContainer());

    expect(
      screen.getByRole('link', {
        name: 'Demonstração: os dados são apagados em 7 dias',
      }),
    ).toHaveAttribute('href', '/sobre-a-demo');
  });

  it('demo fechada (DEP-62): a faixa fala dos animais apagados todos os dias', async () => {
    mockedGetDemoInfo.mockResolvedValue(makeLockedDemoInfo());

    render(await DemoBannerContainer());

    expect(
      screen.getByRole('link', {
        name: 'Demonstração: os animais cadastrados são apagados todos os dias',
      }),
    ).toBeInTheDocument();
  });

  it('demo desligada (DEMO-20): não mostra a faixa', async () => {
    mockedGetDemoInfo.mockResolvedValue(makeDemoInfo({ enabled: false }));

    await expect(DemoBannerContainer()).resolves.toBeNull();
  });

  it('api fora do ar: não mostra a faixa e não quebra a página', async () => {
    mockedGetDemoInfo.mockRejectedValue(new Error('GET /demo failed.'));

    await expect(DemoBannerContainer()).resolves.toBeNull();
  });
});
