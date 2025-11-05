import { useEffect, useState } from "react";

/**
 * Returns true when the container has a measurable size to safely mount heavy components.
 */
export function useMountReady(
  getRect: () => DOMRect | undefined,
  maxTries = 60
): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const tick = () => {
      tries += 1;
      const rect = getRect?.();
      if (rect && rect.width > 2 && rect.height > 2) {
        setReady(true);
        return;
      }
      if (tries < maxTries) {
        raf = requestAnimationFrame(tick);
      } else {
        setReady(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getRect, maxTries]);

  return ready;
}
