/**
 * Query Key Factories
 *
 * Centralized query key definitions following TanStack Query best practices.
 * This ensures consistency, type safety, and easier invalidation patterns.
 *
 * @see https://tanstack.com/query/latest/docs/react/guides/query-keys
 */

/**
 * Calendar Query Keys
 */
export const calendarKeys = {
  all: ["calendar"] as const,

  // Reservations
  reservations: () => [...calendarKeys.all, "reservations"] as const,
  reservationsByPeriod: (periodKey: string, freeRoam: boolean) =>
    [...calendarKeys.reservations(), periodKey, freeRoam] as const,
  reservationsByDateRange: (
    from: string,
    to: string,
    includeCancelled: boolean
  ) =>
    [
      ...calendarKeys.reservations(),
      "date-range",
      from,
      to,
      includeCancelled,
    ] as const,
  reservationsLegacy: (
    future: boolean,
    includeCancelled?: boolean,
    fromDate?: string,
    toDate?: string
  ) =>
    [
      ...calendarKeys.reservations(),
      "legacy",
      future,
      includeCancelled,
      fromDate,
      toDate,
    ] as const,

  // Conversation Events
  conversations: () => [...calendarKeys.all, "conversations"] as const,
  conversationsByPeriod: (periodKey: string, freeRoam: boolean) =>
    [...calendarKeys.conversations(), periodKey, freeRoam] as const,
  conversationsAll: () => [...calendarKeys.conversations(), "all"] as const,

  // Vacations
  vacations: () => [...calendarKeys.all, "vacations"] as const,
} as const;

/**
 * Customer Query Keys
 */
export const customerKeys = {
  all: ["customer"] as const,

  names: () => [...customerKeys.all, "names"] as const,
  stats: (waId: string) => [...customerKeys.all, "stats", waId] as const,
  gridData: (waId: string) => [...customerKeys.all, "grid-data", waId] as const,
} as const;

/**
 * Document Query Keys
 */
export const documentKeys = {
  all: ["document"] as const,

  byWaId: (waId: string) => [...documentKeys.all, waId] as const,
  canvas: (waId: string) => [...documentKeys.byWaId(waId), "canvas"] as const,
} as const;

/**
 * Phone Query Keys
 */
export const phoneKeys = {
  all: ["phone"] as const,

  search: (query: string) => [...phoneKeys.all, "search", query] as const,
  contacts: () => [...phoneKeys.all, "contacts"] as const,
  contactsAll: () => [...phoneKeys.contacts(), "all"] as const,
  contactsRecent: () => [...phoneKeys.contacts(), "recent"] as const,
  stats: () => [...phoneKeys.all, "stats"] as const,
} as const;

/**
 * Chat Query Keys
 */
export const chatKeys = {
  all: ["chat"] as const,

  conversation: (conversationId: string) =>
    [...chatKeys.all, conversationId] as const,
  messages: (conversationId: string) =>
    [...chatKeys.conversation(conversationId), "messages"] as const,
  typingIndicator: () => [...chatKeys.all, "typing-indicator"] as const,
} as const;

/**
 * Dashboard Query Keys
 */
export const dashboardKeys = {
  all: ["dashboard"] as const,

  stats: () => [...dashboardKeys.all, "stats"] as const,
} as const;

/**
 * Reservation Query Keys (mutations)
 */
export const reservationKeys = {
  all: ["reservation"] as const,

  create: () => [...reservationKeys.all, "create"] as const,
  update: (id?: number) => [...reservationKeys.all, "update", id] as const,
  cancel: (id?: number) => [...reservationKeys.all, "cancel", id] as const,
  undo: () => [...reservationKeys.all, "undo"] as const,
} as const;
