import React from "react";

export type RegistrationStatus = "registered" | "unknown";

export function useRegistrationFilter() {
  const [registrationFilter, setRegistrationFilter] = React.useState<
    RegistrationStatus | undefined
  >(undefined);

  const handleRegistrationFilterSelect = React.useCallback(
    (status: RegistrationStatus) => {
      setRegistrationFilter(status);
    },
    []
  );

  const handleRemoveRegistrationFilter = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setRegistrationFilter(undefined);
    },
    []
  );

  const getRegistrationLabel = React.useCallback(
    (status: RegistrationStatus): string =>
      status === "registered" ? "Registered" : "Unknown",
    []
  );

  return {
    registrationFilter,
    setRegistrationFilter,
    handleRegistrationFilterSelect,
    handleRemoveRegistrationFilter,
    getRegistrationLabel,
  };
}
