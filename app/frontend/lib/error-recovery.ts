export const ErrorRecovery = {
  forceRecovery: () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  },
};

