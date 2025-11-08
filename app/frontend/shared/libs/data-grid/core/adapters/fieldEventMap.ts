export function createFieldEventHandler(args: {
  onFieldPersist?: (field: string) => void;
  onNotify?: (field: string) => void;
}) {
  const { onFieldPersist, onNotify } = args;
  return (columnId?: string) => {
    if (!columnId) {
      return;
    }
    if (columnId === "age") {
      onFieldPersist?.("age");
      return;
    }
    if (columnId === "name") {
      onFieldPersist?.("name");
      return;
    }
    if (columnId === "phone") {
      onNotify?.("phone");
    }
  };
}

