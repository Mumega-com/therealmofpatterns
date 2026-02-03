// =====================
// STORE EXPORTS
// =====================

// App state (mode, stage, UI)
export {
  $mode,
  $stage,
  $isLoading,
  $error,
  $isStoreHydrated,
  setMode,
  setStage,
  setLoading,
  setError,
  clearError,
  stageFromKappa,
  type Mode,
  type Stage,
} from './app';

// User state
export {
  $user,
  $isOnboarded,
  $hasEmail,
  $innerOctaveArray,
  setEmail,
  setPro,
  setBirthData,
  setInnerOctave,
  clearUser,
  type BirthData,
  type InnerOctave,
  type UserState,
} from './user';

// Forecast state
export {
  $forecast,
  $isHealthy,
  $isInFailure,
  $kappaPercent,
  $stageLabel,
  $muLevelLabel,
  $activeAspects,
  $nextWindow,
  updateForecast,
  setKappa,
  setFailureMode,
  setAspects,
  setOptimalWindows,
  resetForecast,
  type FailureMode,
  type Aspect,
  type OptimalWindow,
  type ForecastState,
} from './forecast';
