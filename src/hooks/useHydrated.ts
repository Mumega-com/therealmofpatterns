/**
 * Hook to detect if component has hydrated (client-side)
 * Use this to prevent hydration mismatches with localStorage/Date/etc.
 */

import { useState, useEffect } from 'react';

let isHydratedGlobal = false;

/**
 * Returns true once the component has hydrated on the client.
 * Useful for conditionally rendering content that differs between server and client.
 *
 * @example
 * function MyComponent() {
 *   const isHydrated = useHydrated();
 *
 *   // This will match server render, then update after hydration
 *   const mode = isHydrated ? actualMode : defaultMode;
 *
 *   return <div data-mode={mode}>...</div>
 * }
 */
export function useHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(isHydratedGlobal);

  useEffect(() => {
    isHydratedGlobal = true;
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Hook that returns a value only after hydration.
 * Returns defaultValue during SSR/initial render, then realValue after hydration.
 *
 * @example
 * function Footer() {
 *   const year = useHydratedValue(() => new Date().getFullYear(), 2024);
 *   return <span>{year}</span>
 * }
 */
export function useHydratedValue<T>(getValue: () => T, defaultValue: T): T {
  const isHydrated = useHydrated();
  return isHydrated ? getValue() : defaultValue;
}

/**
 * Hook that safely reads from localStorage after hydration.
 * Returns defaultValue during SSR, then actual localStorage value after hydration.
 *
 * @example
 * function ModeIndicator() {
 *   const mode = useLocalStorageValue('rop_mode', 'sol');
 *   return <span>{mode}</span>
 * }
 */
export function useLocalStorageValue<T>(key: string, defaultValue: T): T {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored) as T);
      }
    } catch {
      // Use default if parsing fails
    }
  }, [key]);

  return value;
}
