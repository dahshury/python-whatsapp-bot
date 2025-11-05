export const EVENT_QUERY_KEY = {
  root: ["event"] as const,
  reservation: (id: string | number) =>
    ["event", "reservation", String(id)] as const,
  events: () => ["event", "list"] as const,
};
