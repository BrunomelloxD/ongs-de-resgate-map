import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import {
  REDUCED_MOTION_QUERY,
  usePrefersReducedMotion,
} from './use-prefers-reduced-motion';

type Listener = () => void;

function mockMatchMedia(initial: boolean) {
  const state = { matches: initial, listeners: new Set<Listener>() };
  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return query === REDUCED_MOTION_QUERY && state.matches;
    },
    addEventListener: (_: string, l: Listener) => state.listeners.add(l),
    removeEventListener: (_: string, l: Listener) => state.listeners.delete(l),
  })) as unknown as typeof window.matchMedia;
  return state;
}

describe('usePrefersReducedMotion (A11Y-09)', () => {
  it("lê matchMedia('(prefers-reduced-motion: reduce)')", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(window.matchMedia).toHaveBeenCalledWith(
      '(prefers-reduced-motion: reduce)',
    );
    expect(result.current).toBe(true);
  });

  it('acompanha a mudança da preferência e para de ouvir ao desmontar', () => {
    const state = mockMatchMedia(false);
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    state.matches = true;
    act(() => state.listeners.forEach((l) => l()));
    expect(result.current).toBe(true);

    unmount();
    expect(state.listeners.size).toBe(0);
  });

  it('no servidor devolve false sem tocar no matchMedia', () => {
    window.matchMedia = vi.fn() as unknown as typeof window.matchMedia;
    function Probe() {
      return <span>{String(usePrefersReducedMotion())}</span>;
    }

    expect(renderToString(<Probe />)).toBe('<span>false</span>');
    expect(window.matchMedia).not.toHaveBeenCalled();
  });
});
