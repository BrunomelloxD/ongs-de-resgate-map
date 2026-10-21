import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { DESKTOP_QUERY, useIsDesktop } from './use-is-desktop';

type Listener = () => void;

function mockWidth(initial: number) {
  const state = { width: initial, listeners: new Set<Listener>() };
  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return query === DESKTOP_QUERY && state.width >= 1024;
    },
    addEventListener: (_: string, l: Listener) => state.listeners.add(l),
    removeEventListener: (_: string, l: Listener) => state.listeners.delete(l),
  })) as unknown as typeof window.matchMedia;
  return state;
}

describe('useIsDesktop', () => {
  it('MAP-09: 1024 px ou mais → true; MAP-08: 1023 px → false', () => {
    mockWidth(1024);
    expect(renderHook(() => useIsDesktop()).result.current).toBe(true);

    mockWidth(1023);
    expect(renderHook(() => useIsDesktop()).result.current).toBe(false);
  });

  it('acompanha a mudança de largura e para de ouvir ao desmontar', () => {
    const state = mockWidth(390);
    const { result, unmount } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);

    state.width = 1440;
    act(() => state.listeners.forEach((l) => l()));
    expect(result.current).toBe(true);

    unmount();
    expect(state.listeners.size).toBe(0);
  });

  it('no servidor devolve false sem tocar no matchMedia', () => {
    window.matchMedia = vi.fn() as unknown as typeof window.matchMedia;
    function Probe() {
      return <span>{String(useIsDesktop())}</span>;
    }

    expect(renderToString(<Probe />)).toBe('<span>false</span>');
    expect(window.matchMedia).not.toHaveBeenCalled();
  });
});
