"use client";

import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { normalizeTimeToHHmm } from "@shared/libs/utils/date-format";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@shared/ui/empty";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageSquare } from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ConversationMessage } from "@/entities/conversation";
import { logger } from "@/shared/libs/logger";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { GridPattern } from "@/shared/ui/magicui/grid-pattern";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { MessageBubble } from "./message-bubble";
import { ToolCallGroup } from "./tool-call-group";

const SUMMARY_BLOCK_REGEX =
  /<summary>\s*(Tool|Result)\s*:\s*([^<]+)<\/summary>/i;
const CODE_BLOCK_REGEX = /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/i;
const TOOL_RESULT_PLAIN_REGEX = /^\s*(Tool|Result)\s*:\s*(.*)$/im;
const SCROLL_BOTTOM_EPSILON_PX = 8;
const SCROLL_TOP_EPSILON_PX = 2;
type CubicBezierTuple = readonly [number, number, number, number];

const TOOL_GROUP_ANIMATION_DURATION = 0.2;
const TOOL_GROUP_EASE_X1 = 0.4;
const TOOL_GROUP_EASE_Y1 = 0;
const TOOL_GROUP_EASE_X2 = 0.2;
const TOOL_GROUP_EASE_Y2 = 1;
const TOOL_GROUP_ANIMATION_EASE: CubicBezierTuple = [
  TOOL_GROUP_EASE_X1,
  TOOL_GROUP_EASE_Y1,
  TOOL_GROUP_EASE_X2,
  TOOL_GROUP_EASE_Y2,
];
const FLOATING_BUTTON_ANIMATION_DURATION = 0.16;
const FLOATING_BUTTON_EASE_X1 = 0.45;
const FLOATING_BUTTON_EASE_Y1 = 0;
const FLOATING_BUTTON_EASE_X2 = 0.55;
const FLOATING_BUTTON_EASE_Y2 = 1;
const FLOATING_BUTTON_ANIMATION_EASE: CubicBezierTuple = [
  FLOATING_BUTTON_EASE_X1,
  FLOATING_BUTTON_EASE_Y1,
  FLOATING_BUTTON_EASE_X2,
  FLOATING_BUTTON_EASE_Y2,
];
// Bottom offset to position button just above the input area
const SCROLL_BUTTON_BOTTOM_OFFSET = "0.5rem"; // 8px - matches message-list pb-2, positions just above input

const logViewportWarning = (context: string, error: unknown) => {
  logger.warn(`[ChatMessagesViewport] ${context}`, error);
};

export function ChatMessagesViewport({
  messages,
  messageListRef,
  messagesEndRef,
  isLocalized,
  showToolCalls = true,
  isTyping,
  loadMoreButton,
}: {
  messages: ConversationMessage[];
  messageListRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  isLocalized: boolean;
  showToolCalls?: boolean;
  isTyping: boolean;
  loadMoreButton?: React.ReactNode;
}) {
  const [atBottom, setAtBottom] = useState(true);
  const previousShowToolCalls = useRef(showToolCalls);
  const hasMountedRef = useRef(false);
  // Build grouped render model: pair Tool and Result messages; drop empties
  const buildRenderItems = (items: ConversationMessage[]) => {
    type GroupItem = {
      type: "tool_group";
      key: string;
      name: string;
      argsText: string;
      resultText: string;
      date: string;
      time: string;
    };
    type MsgItem = { type: "message"; message: ConversationMessage };

    const out: Array<GroupItem | MsgItem> = [];

    const extract = (
      m: ConversationMessage
    ): { kind: "tool" | "result"; name: string; text?: string } | null => {
      try {
        const raw = String((m as { message?: string }).message || "");
        // Prefer HTML summary form
        const sm = raw.match(SUMMARY_BLOCK_REGEX);
        if (sm?.[1] && sm?.[2]) {
          const kind = sm[1].toLowerCase() as "tool" | "result";
          const name = String(sm[2] || "").trim();
          const codeMatch = raw.match(CODE_BLOCK_REGEX);
          const text = codeMatch?.[1];
          return text ? { kind, name, text } : { kind, name };
        }
        // Fallback plaintext
        const pm = raw.match(TOOL_RESULT_PLAIN_REGEX);
        if (pm?.[1] && pm?.[2]) {
          const kind = pm[1].toLowerCase() as "tool" | "result";
          const name = String(pm[2] || "").trim();
          return { kind, name };
        }
        return null;
      } catch {
        return null;
      }
    };

    for (let i = 0; i < items.length; i += 1) {
      const m = items[i];
      if (!m) {
        continue;
      }
      const parsed = extract(m);
      const role = String((m as { role?: string }).role || "")
        .trim()
        .toLowerCase();
      if (role === "tool" || parsed) {
        if (parsed && parsed.kind === "tool") {
          const next = items[i + 1];
          const nextParsed = next ? extract(next) : null;
          if (
            nextParsed &&
            nextParsed.kind === "result" &&
            nextParsed.name.toLowerCase() === parsed.name.toLowerCase()
          ) {
            // Pair tool args + result
            if (parsed.text || nextParsed.text) {
              out.push({
                type: "tool_group",
                key: `${m.date || ""}|${m.time || ""}|${parsed.name}`,
                name: parsed.name,
                argsText: parsed.text || "",
                resultText: nextParsed.text || "",
                date: m.date || "",
                time: m.time || "",
              });
            }
            i += 1; // consume the result message
            continue;
          }
          // Only tool args present
          if (parsed.text) {
            out.push({
              type: "tool_group",
              key: `${m.date || ""}|${m.time || ""}|${parsed.name}`,
              name: parsed.name,
              argsText: parsed.text || "",
              resultText: "",
              date: m.date || "",
              time: m.time || "",
            });
          }
          // Skip rendering empty-only tool stub
          continue;
        }
        if (parsed && parsed.kind === "result") {
          if (parsed.text) {
            out.push({
              type: "tool_group",
              key: `${m.date || ""}|${m.time || ""}|${parsed.name}`,
              name: parsed.name,
              argsText: "",
              resultText: parsed.text || "",
              date: m.date || "",
              time: m.time || "",
            });
          }
          // Skip empty-only result stub
          continue;
        }
        // If undecidable but role===tool without content, drop it
        continue;
      }
      out.push({ type: "message", message: m });
    }

    return out;
  };

  const renderItems = buildRenderItems(messages);

  // Filter out tool calls if setting is disabled
  const filteredItems = showToolCalls
    ? renderItems
    : renderItems.filter(
        (item) => (item as { type?: string }).type !== "tool_group"
      );

  const shouldSkipToolGroupEntrance =
    !hasMountedRef.current || (!previousShowToolCalls.current && showToolCalls);

  const toolGroupInitialState = shouldSkipToolGroupEntrance
    ? { marginBottom: 8, opacity: 1, y: 0 }
    : { marginBottom: 8, opacity: 0, y: 12 };

  const toolGroupAnimateState = { marginBottom: 8, opacity: 1, y: 0 };
  const toolGroupExitState = { marginBottom: 0, opacity: 0, y: 12 };
  const toolGroupTransition = {
    duration: TOOL_GROUP_ANIMATION_DURATION,
    ease: TOOL_GROUP_ANIMATION_EASE,
  };

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  const handleScrollUpdate = useCallback(
    (values: unknown) => {
      try {
        const v = values as {
          scrollTop?: number;
          contentScrollHeight?: number;
          clientHeight?: number;
        };
        const scrollTop = Number(v?.scrollTop || 0);
        const contentScrollHeight = Number(v?.contentScrollHeight || 0);
        const clientHeight = Number(v?.clientHeight || 0);
        const distanceFromBottom = Math.max(
          0,
          contentScrollHeight - clientHeight - scrollTop
        );
        setAtBottom(distanceFromBottom <= SCROLL_BOTTOM_EPSILON_PX);
      } catch {
        // Fallback to DOM if values missing
        try {
          const scroller = (messageListRef.current?.closest(
            ".ScrollbarsCustom-Scroller"
          ) || null) as HTMLElement | null;
          if (!scroller) {
            return;
          }
          const distanceFromBottom = Math.max(
            0,
            scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
          );
          setAtBottom(distanceFromBottom <= SCROLL_BOTTOM_EPSILON_PX);
        } catch (error) {
          logViewportWarning(
            "Fallback scroll distance calculation failed",
            error
          );
        }
      }
    },
    [messageListRef]
  );

  const scrollToBottom = useCallback(() => {
    try {
      // Prefer scrollbars-custom API when available
      const scroller = (messageListRef.current?.closest(
        ".ScrollbarsCustom-Scroller"
      ) || null) as HTMLElement | null;
      if (scroller) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
        return;
      }
    } catch (error) {
      logViewportWarning("Custom scroller smooth scroll failed", error);
    }
    // Fallback to messagesEndRef
    try {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    } catch (error) {
      logViewportWarning("Fallback scrollIntoView failed", error);
    }
  }, [messageListRef, messagesEndRef]);

  // Preserve scroll position when toggling tool calls visibility
  useEffect(() => {
    if (previousShowToolCalls.current !== showToolCalls) {
      previousShowToolCalls.current = showToolCalls;

      // Capture current scroll position
      try {
        const scroller = (messageListRef.current?.closest(
          ".ScrollbarsCustom-Scroller"
        ) || null) as HTMLElement | null;

        if (scroller) {
          const wasAtBottom =
            scroller.scrollHeight -
              scroller.clientHeight -
              scroller.scrollTop <=
            SCROLL_BOTTOM_EPSILON_PX;

          // Use requestAnimationFrame to restore position after DOM updates
          requestAnimationFrame(() => {
            if (wasAtBottom) {
              // If user was at bottom, keep them at bottom
              scroller.scrollTop =
                scroller.scrollHeight - scroller.clientHeight;
            }
            // Otherwise, do nothing - layout animations will handle smooth transitions
          });
        }
      } catch (error) {
        logViewportWarning(
          "Restoring scroll position after tool call toggle failed",
          error
        );
      }
    }
  }, [showToolCalls, messageListRef]);

  return (
    <div className="relative flex-1">
      <GridPattern
        className="absolute inset-0 z-0 text-foreground/11 [mask-image:radial-gradient(75%_60%_at_50%_12%,#000_45%,transparent_100%)]"
        height={36}
        strokeDasharray={"3 3"}
        strokeWidth={0.1}
        width={36}
        x={-1}
        y={-1}
      />
      <ThemedScrollbar
        className="scrollbar-autohide chat-scrollbar relative z-10 flex-1 bg-transparent"
        noScrollX
        onUpdate={(values) => {
          try {
            // Track top state (existing behavior)
            const scrollTopVal = (values as { scrollTop?: number })?.scrollTop;
            const atTopViaApi =
              typeof scrollTopVal === "number" &&
              scrollTopVal <= SCROLL_TOP_EPSILON_PX;
            let atTop = atTopViaApi;
            if (!atTopViaApi) {
              const scroller = (messageListRef.current?.closest(
                ".ScrollbarsCustom-Scroller"
              ) || null) as HTMLElement | null;
              const container = messageListRef.current as HTMLElement | null;
              if (!container) {
                return;
              }
              atTop = Boolean(
                scroller ? scroller.scrollTop <= SCROLL_TOP_EPSILON_PX : true
              );
            }
            const ev = new CustomEvent("chat:scrollTopState", {
              detail: { atTop },
            });
            window.dispatchEvent(ev);
          } catch (error) {
            logViewportWarning("Emitting scrollTopState event failed", error);
          }
          // Track bottom state for floating button visibility
          handleScrollUpdate(values);
        }}
        rtl={false}
        style={{ height: "100%" }}
      >
        <div className="message-list px-4 pt-4 pb-2" ref={messageListRef}>
          {/* Load More Button - rendered inside scrollable container for proper sticky behavior */}
          {loadMoreButton}
          {messages.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquare />
                </EmptyMedia>
                <EmptyTitle>
                  {i18n.getMessage("chat_no_messages", isLocalized)}
                </EmptyTitle>
                <EmptyDescription>
                  {i18n.getMessage("chat_start_conversation", isLocalized)}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            filteredItems.map((item, idx) => {
              const isGroup = (item as { type?: string }).type === "tool_group";
              const message = (item as { message?: ConversationMessage })
                .message;
              const role = message
                ? String((message as { role?: string }).role || "")
                    .trim()
                    .toLowerCase()
                : "tool";

              // Tool groups animate in/out, messages stay static
              if (isGroup) {
                return (
                  <AnimatePresence
                    key={`${(item as { key: string }).key}|${idx}`}
                  >
                    <motion.div
                      animate={toolGroupAnimateState}
                      className="message-row"
                      data-message-index={idx}
                      data-role="tool"
                      exit={toolGroupExitState}
                      initial={toolGroupInitialState}
                      transition={toolGroupTransition}
                    >
                      <ToolCallGroup
                        argsText={(item as { argsText: string }).argsText || ""}
                        resultText={
                          (item as { resultText: string }).resultText || ""
                        }
                        toolName={(item as { name: string }).name}
                        valueKey={(item as { key: string }).key}
                      />
                    </motion.div>
                  </AnimatePresence>
                );
              }

              // Messages render without animation
              return (
                <div
                  className={cn(
                    "message-row",
                    role === "user" && "message-row-user",
                    role === "admin" && "message-row-admin",
                    role === "assistant" && "message-row-assistant",
                    role === "secretary" && "message-row-secretary"
                  )}
                  data-message-date={
                    (message as { date?: string } | undefined)?.date || ""
                  }
                  data-message-index={idx}
                  data-message-time={normalizeTimeToHHmm(
                    (message as { time?: string } | undefined)?.time || ""
                  )}
                  data-role={role}
                  key={`${message?.date}|${message?.time}|${role}|${String(message?.message || "").slice(0, 24)}|${idx}`}
                >
                  <MessageBubble
                    isUser={role === "user"}
                    message={message as ConversationMessage}
                  />
                </div>
              );
            })
          )}
          {isTyping && (
            <div className="sticky bottom-0 z-20 bg-gradient-to-t from-card/95 to-card/30 px-4 pt-1 pb-2 backdrop-blur supports-[backdrop-filter]:bg-card/75">
              <article
                aria-live="polite"
                className="relative w-full rounded-lg border border-ring/20 bg-gradient-to-b from-ring/20 to-ring/10 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    aria-hidden="true"
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted-foreground font-medium text-background text-xs"
                  >
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-muted-foreground text-sm">
                      <LoadingDots size={4}>
                        <span className="text-xs">
                          {i18n.getMessage("typing", isLocalized)}
                        </span>
                      </LoadingDots>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ThemedScrollbar>

      {/* Floating scroll-to-bottom button */}
      <AnimatePresence>
        {!atBottom && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="pointer-events-none absolute right-4"
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            style={{
              bottom: SCROLL_BUTTON_BOTTOM_OFFSET,
              zIndex: "var(--z-scroll-button)",
            }}
            transition={{
              duration: FLOATING_BUTTON_ANIMATION_DURATION,
              ease: FLOATING_BUTTON_ANIMATION_EASE,
            }}
          >
            <button
              aria-label={i18n.getMessage("scroll_to_bottom", isLocalized)}
              className="pointer-events-auto relative z-50 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={scrollToBottom}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 16a1 1 0 0 1-.707-.293l-6-6a1 1 0 1 1 1.414-1.414L12 13.586l5.293-5.293a1 1 0 0 1 1.414 1.414l-6 6A1 1 0 0 1 12 16Z" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
