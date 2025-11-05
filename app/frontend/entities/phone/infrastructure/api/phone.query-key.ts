export const PHONE_QUERY_KEY = {
  root: ["phone"] as const,
  search: (q: string) => [...PHONE_QUERY_KEY.root, "search", q] as const,
};
