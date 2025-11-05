import { useCallback, useState } from "react";

export function useDocumentTransitionState(initial = false) {
  const [isSceneTransitioning, setSceneTransitioning] = useState(initial);

  const beginSceneTransition = useCallback(() => {
    setSceneTransitioning(true);
  }, []);

  const endSceneTransition = useCallback(() => {
    setSceneTransitioning(false);
  }, []);

  return {
    isSceneTransitioning,
    beginSceneTransition,
    endSceneTransition,
  } as const;
}

