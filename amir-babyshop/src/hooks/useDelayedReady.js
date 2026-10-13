import { useEffect, useState } from 'react';

/**
 * Returns true after `delayMs` milliseconds.
 * Used to simulate a loading state for skeletons.
 */
export function useDelayedReady(delayMs = 400) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  return ready;
}