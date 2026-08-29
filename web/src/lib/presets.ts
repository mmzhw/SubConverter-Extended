import { FormState } from './url-builder';

export interface Preset { name: string; state: FormState; savedAt: number; }

export const PRESETS_KEY = 'sce-config-presets-v1';

export type PresetsResult =
  | { ok: true; presets: Preset[] }
  | { ok: false; error: 'storage-unavailable' };

export function loadPresets(storage: Storage = localStorage): PresetsResult {
  try {
    const raw = storage.getItem(PRESETS_KEY);
    if (!raw) return { ok: true, presets: [] };
    const parsed = JSON.parse(raw);
    return { ok: true, presets: Array.isArray(parsed) ? (parsed as Preset[]) : [] };
  } catch {
    return { ok: false, error: 'storage-unavailable' };
  }
}

export function savePreset(name: string, state: FormState, storage: Storage = localStorage): PresetsResult {
  const loaded = loadPresets(storage);
  if (!loaded.ok) return loaded;
  const presets = [...loaded.presets.filter((p) => p.name !== name), { name, state, savedAt: Date.now() }];
  try {
    storage.setItem(PRESETS_KEY, JSON.stringify(presets));
    return { ok: true, presets };
  } catch {
    return { ok: false, error: 'storage-unavailable' };
  }
}

export function deletePreset(name: string, storage: Storage = localStorage): PresetsResult {
  const loaded = loadPresets(storage);
  if (!loaded.ok) return loaded;
  const presets = loaded.presets.filter((p) => p.name !== name);
  try {
    storage.setItem(PRESETS_KEY, JSON.stringify(presets));
    return { ok: true, presets };
  } catch {
    return { ok: false, error: 'storage-unavailable' };
  }
}
