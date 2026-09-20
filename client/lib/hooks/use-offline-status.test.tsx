import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useOfflineStatus } from './use-offline-status';
import { markServedFromCache, markServedFresh } from '../offline-status';

describe('useOfflineStatus', () => {
  beforeEach(() => {
    markServedFresh();
  });

  it('reflete o status atual e reage a mudanças', () => {
    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current).toBe(false);

    act(() => markServedFromCache());

    expect(result.current).toBe(true);

    act(() => markServedFresh());

    expect(result.current).toBe(false);
  });
});
