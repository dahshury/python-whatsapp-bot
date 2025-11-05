import type React from "react";

type Props = { cancelled?: boolean; title?: string };

export const EventBadge: React.FC<Props> = ({ cancelled, title }) => (
  <span
    style={{
      padding: "2px 6px",
      borderRadius: 6,
      background: cancelled ? "#FEE2E2" : "#DCFCE7",
      color: cancelled ? "#991B1B" : "#065F46",
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    {cancelled ? "Cancelled" : (title ?? "Event")}
  </span>
);

export default EventBadge;
