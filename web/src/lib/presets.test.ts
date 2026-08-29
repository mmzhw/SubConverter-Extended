import { describe, it, expect } from 'vitest';
import { PRESETS_KEY, loadPresets, savePreset, deletePreset } from './presets';

function makeStorage(initial: string | null = null): Storage {
  const map = new Map<string, string>();
  if (initial) map.set(PRESETS_KEY, initial);
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => { map.clear(); },
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

const throwingStorage = {
  getItem: () => { throw new Error('denied'); },
  setItem: () => { throw new Error('denied'); },
} as unknown as Storage;

const state = { target: 'clash', sourceUrl: 'https://s', backendBase: '', options: { emoji: true } };

describe('presets', () => {
  it('saves and loads a preset round trip', () => {
    const storage = makeStorage();
    expect(savePreset('home', state, storage).ok).toBe(true);
    const res = loadPresets(storage);
    expect(res.ok && res.presets).toHaveLength(1);
    if (res.ok) {
      expect(res.presets[0].name).toBe('home');
      expect(res.presets[0].state.options.emoji).toBe(true);
    }
  });

  it('overwrites a preset with the same name', () => {
    const storage = makeStorage();
    savePreset('a', state, storage);
    savePreset('a', { ...state, target: 'singbox' }, storage);
    const res = loadPresets(storage);
    if (res.ok) {
      expect(res.presets).toHaveLength(1);
      expect(res.presets[0].state.target).toBe('singbox');
    }
  });

  it('deletes a preset', () => {
    const storage = makeStorage();
    savePreset('a', state, storage);
    deletePreset('a', storage);
    const res = loadPresets(storage);
    expect(res.ok && res.presets).toHaveLength(0);
  });

  it('reports storage-unavailable when storage throws', () => {
    expect(savePreset('a', state, throwingStorage)).toEqual({ ok: false, error: 'storage-unavailable' });
    expect(loadPresets(throwingStorage)).toEqual({ ok: false, error: 'storage-unavailable' });
  });

  it('reports storage-unavailable when deleting from throwing storage', () => {
    expect(deletePreset('a', throwingStorage)).toEqual({ ok: false, error: 'storage-unavailable' });
  });
});
