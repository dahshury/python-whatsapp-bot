import { useCallback, useEffect } from "react";

const DEFAULT_BACKDROP_CLASS = "has-dialog-backdrop";

export function useDialogBackdrop(
  open: boolean,
  isExiting: boolean,
  backdropClass = DEFAULT_BACKDROP_CLASS
) {
  useEffect(() => {
    const body = document.body;
    if (open || isExiting) {
      body.classList.add(backdropClass);
    } else {
      body.classList.remove(backdropClass);
    }
  }, [open, isExiting, backdropClass]);

  useEffect(
    () => () => {
      document.body.classList.remove(backdropClass);
    },
    [backdropClass]
  );

  const onExitComplete = useCallback(() => {
    document.body.classList.remove(backdropClass);
  }, [backdropClass]);

  return { onExitComplete };
}
