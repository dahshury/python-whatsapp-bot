import type {
  CustomerSegment,
  DashboardReservation,
} from "@/features/dashboard/types";

const PERCENT = 100;
const AVG_RETURNING_RES = 3;
const AVG_LOYAL_RES = 6;
const NEW_THRESHOLD = 1;
const RETURNING_MAX_THRESHOLD = 5;

export function computeCustomerSegments(
  filteredReservations: [string, DashboardReservation[]][],
  uniqueCustomers: number
): CustomerSegment[] {
  let new1 = 0;
  let returning2to5 = 0;
  let loyal6 = 0;
  for (const [, items] of filteredReservations) {
    const len = Array.isArray(items) ? items.length : 0;
    if (len <= NEW_THRESHOLD) {
      new1 += 1;
    } else if (len <= RETURNING_MAX_THRESHOLD) {
      returning2to5 += 1;
    } else {
      loyal6 += 1;
    }
  }
  return [
    {
      segment: "New (1 visit)",
      count: new1,
      percentage: uniqueCustomers ? (new1 / uniqueCustomers) * PERCENT : 0,
      avgReservations: new1 ? 1 : 0,
    },
    {
      segment: "Returning (2-5 visits)",
      count: returning2to5,
      percentage: uniqueCustomers
        ? (returning2to5 / uniqueCustomers) * PERCENT
        : 0,
      avgReservations: returning2to5 ? AVG_RETURNING_RES : 0,
    },
    {
      segment: "Loyal (6+ visits)",
      count: loyal6,
      percentage: uniqueCustomers ? (loyal6 / uniqueCustomers) * PERCENT : 0,
      avgReservations: loyal6 ? AVG_LOYAL_RES : 0,
    },
  ];
}
