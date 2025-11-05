import type React from "react";

type MessageRole = "user" | "assistant" | "system" | "tool";

type Props = {
  role: MessageRole;
  size?: number;
};

const FONT_SIZE_RATIO = 0.6;

const roleConfig: Record<
  MessageRole,
  { color: string; bg: string; label: string }
> = {
  user: { color: "#1E40AF", bg: "#DBEAFE", label: "User" },
  assistant: { color: "#047857", bg: "#D1FAE5", label: "Assistant" },
  system: { color: "#7C3AED", bg: "#EDE9FE", label: "System" },
  tool: { color: "#DC2626", bg: "#FEE2E2", label: "Tool" },
};

export const MessageRoleIndicator: React.FC<Props> = ({ role, size = 16 }) => {
  const config = roleConfig[role] || roleConfig.user;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: config.bg,
        color: config.color,
        fontSize: size * FONT_SIZE_RATIO,
        fontWeight: 700,
      }}
      title={`${config.label} message`}
    >
      {config.label[0]}
    </span>
  );
};

export default MessageRoleIndicator;
