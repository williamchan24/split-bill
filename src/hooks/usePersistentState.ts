import { useEffect, useState } from 'react';

/** Like useState, but saved to localStorage so data survives a page refresh. */
export function usePersistentState<T>(key: string, initial: () => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initial();
    } catch {
      return initial();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked — app still works, just won't persist */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
