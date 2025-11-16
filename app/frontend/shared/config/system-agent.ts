const DEFAULT_SYSTEM_AGENT_WA_ID =
  process.env.NEXT_PUBLIC_SYSTEM_AGENT_WA_ID ||
  process.env.SYSTEM_AGENT_WA_ID ||
  "12125550123";

const DEFAULT_SYSTEM_AGENT_NAME =
  process.env.NEXT_PUBLIC_SYSTEM_AGENT_NAME ||
  process.env.SYSTEM_AGENT_NAME ||
  "Calendar AI Assistant";

export const SYSTEM_AGENT = {
  waId: DEFAULT_SYSTEM_AGENT_WA_ID,
  displayName: DEFAULT_SYSTEM_AGENT_NAME,
} as const;
