import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useIsMobile } from './use-mobile';

function mockMatchMedia(larguraInicial: number) {
  let onChange: (() => void) | undefined;
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: larguraInicial,
  });
  window.matchMedia = vi.fn().mockReturnValue({
    matches: larguraInicial < 768,
    media: '(max-width: 767px)',
    addEventListener: (_evento: string, listener: () => void) => {
      onChange = listener;
    },
    removeEventListener: vi.fn(),
  });
  return {
    simularMudancaDeLargura(novaLargura: number) {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: novaLargura });
      onChange?.();
    },
  };
}

describe('useIsMobile', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('começa false em tela desktop e reage à mudança pra mobile', () => {
    const { simularMudancaDeLargura } = mockMatchMedia(1024);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => simularMudancaDeLargura(500));

    expect(result.current).toBe(true);
  });

  it('remove o listener de mudança de mídia ao desmontar', () => {
    let removeEventListenerSpy: ReturnType<typeof vi.fn> = vi.fn();
    window.matchMedia = vi.fn().mockImplementation(() => {
      const mql = {
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      removeEventListenerSpy = mql.removeEventListener;
      return mql;
    });

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
