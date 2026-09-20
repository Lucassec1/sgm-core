import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  markServedFromCache,
  markServedFresh,
  getOfflineStatus,
  subscribeOfflineStatus,
} from './offline-status';

describe('offline-status', () => {
  beforeEach(() => {
    // Estado é módulo-global — garante que cada teste comece do mesmo lugar (fresh).
    markServedFresh();
  });

  it('começa como "fresh" (não servindo do cache)', () => {
    expect(getOfflineStatus()).toBe(false);
  });

  it('markServedFromCache muda o status pra true e notifica os listeners', () => {
    const listener = vi.fn();
    subscribeOfflineStatus(listener);

    markServedFromCache();

    expect(getOfflineStatus()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('markServedFresh muda o status pra false e notifica os listeners', () => {
    markServedFromCache();
    const listener = vi.fn();
    subscribeOfflineStatus(listener);

    markServedFresh();

    expect(getOfflineStatus()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('não notifica os listeners quando o valor não muda', () => {
    markServedFresh();
    const listener = vi.fn();
    subscribeOfflineStatus(listener);

    markServedFresh();

    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribeOfflineStatus devolve uma função que cancela a inscrição', () => {
    const listener = vi.fn();
    const cancelar = subscribeOfflineStatus(listener);

    cancelar();
    markServedFromCache();

    expect(listener).not.toHaveBeenCalled();
  });
});
