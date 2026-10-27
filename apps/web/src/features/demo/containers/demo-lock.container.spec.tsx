import { render, screen } from '@testing-library/react';
import { getDemoInfo } from '../queries/get-demo-info';
import { makeDemoInfo, makeLockedDemoInfo } from '../test-fixtures';
import { DemoLockContainer } from './demo-lock.container';

vi.mock('../queries/get-demo-info', () => ({ getDemoInfo: vi.fn() }));
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));

const mockedGetDemoInfo = vi.mocked(getDemoInfo);

const form = <button type="submit">Enviar</button>;

describe('DemoLockContainer', () => {
  it('demo fechada: aviso e botão desativado (DEP-19, DEP-20)', async () => {
    mockedGetDemoInfo.mockResolvedValue(makeLockedDemoInfo());

    render(await DemoLockContainer({ children: form }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Indisponível na demo.',
    );
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('demo aberta: só o conteúdo, ativo (DEP-23)', async () => {
    mockedGetDemoInfo.mockResolvedValue(makeDemoInfo());

    render(await DemoLockContainer({ children: form }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });

  it('api fora do ar: deixa o conteúdo como está', async () => {
    mockedGetDemoInfo.mockRejectedValue(new Error('GET /demo failed.'));

    render(await DemoLockContainer({ children: form }));

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });
});
