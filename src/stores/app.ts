import { atom, computed } from 'nanostores';

// =====================
// MODE STATE
// =====================
export type Mode = 'kasra' | 'river' | 'sol';
export type Stage = 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';

export const $mode = atom<Mode>('sol');
export const $stage = atom<Stage>('citrinitas');
export const $isStoreHydrated = atom<boolean>(false);

// Initialize store hydration — Sol is the default experience.
// Only /profile restores saved mode for power users.
if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    if (window.location.pathname === '/profile') {
      const savedMode = localStorage.getItem('rop_mode') as Mode;
      if (savedMode && ['kasra', 'river', 'sol'].includes(savedMode)) {
        $mode.set(savedMode);
        document.documentElement.dataset.mode = savedMode;
      }
    }
    $isStoreHydrated.set(true);
  });
}

// Mode actions
export function setMode(mode: Mode) {
  $mode.set(mode);
  if (typeof window !== 'undefined') {
    localStorage.setItem('rop_mode', mode);
    document.documentElement.dataset.mode = mode;
    window.dispatchEvent(new CustomEvent('modechange', { detail: mode }));
  }
}

// Stage actions (for River mode)
export function setStage(stage: Stage) {
  $stage.set(stage);
  if (typeof window !== 'undefined') {
    document.documentElement.dataset.stage = stage;
  }
}

// Computed: stage from kappa
export function stageFromKappa(kappa: number): Stage {
  if (kappa < 0.25) return 'nigredo';
  if (kappa < 0.50) return 'albedo';
  if (kappa < 0.75) return 'citrinitas';
  return 'rubedo';
}

// =====================
// UI STATE
// =====================
export const $isLoading = atom<boolean>(false);
export const $error = atom<string | null>(null);

export function setLoading(loading: boolean) {
  $isLoading.set(loading);
}

export function setError(error: string | null) {
  $error.set(error);
}

export function clearError() {
  $error.set(null);
}
