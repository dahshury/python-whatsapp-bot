import type React from "react";
import { RSVPStatus } from "../types/rsvp.types";

type Props = {
  status: RSVPStatus;
  size?: "sm" | "md" | "lg";
};

const statusConfig: Record<
  RSVPStatus,
  { color: string; bg: string; label: string }
> = {
  [RSVPStatus.PENDING]: { color: "#92400E", bg: "#FEF3C7", label: "Pending" },
  [RSVPStatus.CONFIRMED]: {
    color: "#065F46",
    bg: "#D1FAE5",
    label: "Confirmed",
  },
  [RSVPStatus.CANCELLED]: {
    color: "#991B1B",
    bg: "#FEE2E2",
    label: "Cancelled",
  },
  [RSVPStatus.DECLINED]: { color: "#7C2D12", bg: "#FED7AA", label: "Declined" },
};

const sizeMap = {
  sm: { padding: "2px 6px", fontSize: 11 },
  md: { padding: "4px 8px", fontSize: 12 },
  lg: { padding: "6px 10px", fontSize: 14 },
};

export const RsvpStatusBadge: React.FC<Props> = ({ status, size = "md" }) => {
  const config = statusConfig[status] || statusConfig[RSVPStatus.PENDING];
  const sizeStyles = sizeMap[size];

  return (
    <span
      style={{
        ...sizeStyles,
        borderRadius: 6,
        background: config.bg,
        color: config.color,
        fontWeight: 600,
        display: "inline-block",
      }}
      title={`RSVP status: ${config.label}`}
    >
      {config.label}
    </span>
  );
};

export default RsvpStatusBadge;
