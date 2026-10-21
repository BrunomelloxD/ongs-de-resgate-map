import { render, screen } from '@testing-library/react';
import credits from '../credits.json';
import { getDemoInfo } from '../queries/get-demo-info';
import { makeDemoInfo } from '../test-fixtures';
import { AboutDemoContainer } from './about-demo.container';

vi.mock('../queries/get-demo-info', () => ({ getDemoInfo: vi.fn() }));
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));

describe('AboutDemoContainer', () => {
  it('mostra os valores da query e os créditos do credits.json', async () => {
    vi.mocked(getDemoInfo).mockResolvedValue(
      makeDemoInfo({ retentionDays: 14 }),
    );

    render(await AboutDemoContainer());

    expect(
      screen.getByText('Dias até a exclusão automática').nextElementSibling,
    ).toHaveTextContent('14');
    for (const credit of credits) {
      expect(screen.getByRole('link', { name: credit.title })).toHaveAttribute(
        'href',
        credit.page,
      );
    }
  });

  it('propaga a falha da api para o error boundary', async () => {
    vi.mocked(getDemoInfo).mockRejectedValue(new Error('GET /demo failed.'));

    await expect(AboutDemoContainer()).rejects.toThrow('GET /demo failed.');
  });
});
