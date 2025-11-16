"use client";
// Replaced Textarea with TipTap's EditorContent for live formatting
import { useQueryClient } from "@tanstack/react-query";
import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { toastService } from "@shared/libs/toast";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import {
  Ban,
  ChevronUp,
  MessageSquare,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
// Reservation type no longer needed here after switching to provider hooks
import type { ConversationMessage } from "@/entities/conversation";
import {
  useChatScroll,
  useConversationActivity,
  useSendMessage,
} from "@/features/chat";
import { BasicChatInput } from "@/features/chat/chat/basic-chat-input";
import { ChatMessagesViewport } from "@/features/chat/chat/chat-messages-viewport";
import {
  useLanguageStore,
  useSettingsStore,
} from "@/infrastructure/store/app-store";
import { logger } from "@/shared/libs/logger";
import { SYSTEM_AGENT } from "@/shared/config";
import { callPythonBackend } from "@/shared/libs/backend";
import { Spinner } from "@/shared/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { chatKeys, customerKeys } from "@/shared/api/query-keys";
import {
  useConversationMessagesQuery,
  useCustomerNames,
  useTypingIndicator,
} from "./hooks";
import type { CustomerName } from "./hooks/useCustomerNames";

type ChatSidebarContentProps = {
  selectedConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onRefresh?: () => void;
  className?: string;
};

const TIME_FORMAT_REGEX = /^\d{2}:\d{2}(?::\d{2})?$/;
const TIME_WITHOUT_SECONDS_LENGTH = 5;
const LOAD_MORE_RESET_DELAY_MS = 100;
const WHATSAPP_TYPING_WINDOW_MS = 15000;
const TYPING_THROTTLE_MS = WHATSAPP_TYPING_WINDOW_MS - 1000; // refresh ~1s before expiry
const TYPING_STOP_DEBOUNCE_MS = 4000;

const logSidebarWarning = (context: string, error: unknown) => {
  logger.warn(`[ChatSidebar] ${context}`, error);
};

type MutationResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

// message bubble moved to components/chat/message-bubble

export const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({
  selectedConversationId,
  onRefresh: _onRefresh,
  className,
}) => {
  const { isLocalized } = useLanguageStore();
  const { showToolCalls, chatMessageLimit, sendTypingIndicator } =
    useSettingsStore();
  const { isLoadingConversation, setLoadingConversation } =
    useSidebarChatStore();
  const queryClient = useQueryClient();

  // Fetch conversation messages on-demand using TanStack Query
  const {
    data: conversationMessages = [],
    isLoading: isLoadingConversationMessages,
  } = useConversationMessagesQuery(selectedConversationId);

  // Update loading state based on TanStack Query
  useEffect(() => {
    if (!selectedConversationId) {
      setLoadingConversation(false);
      return;
    }

    // Clear loading when messages are loaded
    if (!isLoadingConversationMessages && conversationMessages.length >= 0) {
      setLoadingConversation(false);
    }
  }, [
    selectedConversationId,
    isLoadingConversationMessages,
    conversationMessages.length,
    setLoadingConversation,
  ]);
  const { sendMessage } = useSendMessage(selectedConversationId || "");
  const [isSending, setIsSending] = useState(false);
  const [loadedMessageCount, setLoadedMessageCount] =
    useState<number>(chatMessageLimit);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAtTop, setIsAtTop] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  // scrolling refs managed by useChatScroll below

  // Local state for additional messages (not optimistic - only added on success)
  const [additionalMessages, setAdditionalMessages] = useState<
    Record<string, ConversationMessage[]>
  >({});

  // Combine fetched messages with additional messages for this conversation
  const conversationAdditional = selectedConversationId
    ? additionalMessages[selectedConversationId] || []
    : [];
  const allMessages = [
    ...conversationMessages,
    ...conversationAdditional,
  ] as ConversationMessage[];

  // Sort messages by robust ISO datetime parsing
  const getMessageTimestamp = (m: ConversationMessage): number => {
    try {
      const date = String((m as { date?: string }).date || "");
      const timeRaw = String((m as { time?: string }).time || "");
      if (!date) {
        return 0;
      }
      let t = timeRaw;
      if (t && TIME_FORMAT_REGEX.test(t)) {
        if (t.length === TIME_WITHOUT_SECONDS_LENGTH) {
          t = `${t}:00`;
        }
        const d = new Date(`${date}T${t}`);
        return Number.isNaN(d.getTime()) ? 0 : d.getTime();
      }
      const d = new Date(`${date}T00:00:00`);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    } catch {
      return 0;
    }
  };

  const sortedMessages = [...allMessages].sort(
    (a, b) => getMessageTimestamp(a) - getMessageTimestamp(b)
  ) as ConversationMessage[];

  // Apply message limit (show last N messages)
  const limitedMessages = useMemo(
    () => sortedMessages.slice(-loadedMessageCount),
    [sortedMessages, loadedMessageCount]
  );

  const hasMoreMessages = sortedMessages.length > limitedMessages.length;
  const conversationHasMessages = sortedMessages.length > 0;

  // Customer metadata for the active conversation (favorites / blocked)
  const { data: customerNames } = useCustomerNames();
  const shouldShowCombobox = Boolean(customerNames);
  const currentCustomer: CustomerName | undefined = selectedConversationId
    ? customerNames?.[selectedConversationId]
    : undefined;
  const conversationBlocked = Boolean(currentCustomer?.is_blocked);
  const conversationFavorited = Boolean(currentCustomer?.is_favorite);

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    // Use RAF to ensure state updates before scroll calculation
    requestAnimationFrame(() => {
      setLoadedMessageCount((prev) => prev + chatMessageLimit);
      // Reset loading flag after a brief delay
      setTimeout(() => setIsLoadingMore(false), LOAD_MORE_RESET_DELAY_MS);
    });
  }, [chatMessageLimit]);

  // Reset loaded count when conversation changes
  useEffect(() => {
    setLoadedMessageCount(chatMessageLimit);
  }, [chatMessageLimit]);

  // Scrolling handled by dedicated hook
  const { messageListRef, messagesEndRef } = useChatScroll(
    selectedConversationId,
    limitedMessages,
    {
      preventAutoScroll: isLoadingMore,
    }
  );

  // Listen for top-of-scroll state emitted by viewport
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const { atTop } = (e as CustomEvent).detail || {};
        if (typeof atTop === "boolean") {
          setIsAtTop(atTop);
        }
      } catch (error) {
        logSidebarWarning("scrollTopState event handler failed", error);
      }
    };
    window.addEventListener("chat:scrollTopState", handler as EventListener);
    return () =>
      window.removeEventListener(
        "chat:scrollTopState",
        handler as EventListener
      );
  }, []);

  // Clear additional messages when conversation changes
  useEffect(() => {
    setAdditionalMessages({});
  }, []);

  // Listen for typing indicator events for the selected conversation
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const { wa_id, typing } = (ev as CustomEvent).detail || {};
        if (!selectedConversationId) {
          return;
        }
        if (String(wa_id) === String(selectedConversationId)) {
          setIsTyping(Boolean(typing));
        }
      } catch (error) {
        logSidebarWarning("typing indicator event handler failed", error);
      }
    };
    window.addEventListener("chat:typing", handler as EventListener);
    return () =>
      window.removeEventListener("chat:typing", handler as EventListener);
  }, [selectedConversationId]);

  // Auto scroll and realtime handled by useChatScroll

  // Send message function - called by BasicChatInput
  const handleSendMessage = async (messageText: string) => {
    if (!selectedConversationId || isSending) {
      return;
    }

    if (conversationBlocked) {
      toastService.error(
        i18n.getMessage("chat_blocked_notice", isLocalized)
      );
      return;
    }

    setIsSending(true);

    try {
      await sendMessage(messageText);

      // Do not append locally; rely on backend broadcast to update conversations
    } catch (error) {
      // Log detailed error for debugging
      logger.error("[ChatSidebar] Failed to send message", {
        error,
        conversationId: selectedConversationId,
        messageLength: messageText?.length,
      });

      // Show detailed error message to user
      const errorDetails =
        error instanceof Error ? error.message : String(error);
      const errorMessage = `${i18n.getMessage("chat_message_failed", isLocalized)}: ${errorDetails}`;
      toastService.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  // Simple input state - no complex calculations
  const hasConversationSelected = !!selectedConversationId;
  const isSystemAgentConversation =
    hasConversationSelected && selectedConversationId === SYSTEM_AGENT.waId;
  // Inactivity: last USER message > 24 hours ago (skip for system agent)
  const hasConversationTimedOut = useConversationActivity(limitedMessages);
  const defaultInactivityMessage =
    limitedMessages.length === 0
      ? i18n.getMessage("chat_cannot_message_no_conversation", isLocalized)
      : i18n.getMessage("chat_messaging_unavailable", isLocalized);
  const restrictionMessage = conversationBlocked
    ? i18n.getMessage("chat_blocked_notice", isLocalized)
    : !isSystemAgentConversation && hasConversationTimedOut
      ? defaultInactivityMessage
      : undefined;
  const inputPlaceholder = hasConversationSelected
    ? i18n.getMessage("chat_type_message", isLocalized)
    : i18n.getMessage("chat_no_conversation", isLocalized);
  const composerDisabled =
    !hasConversationSelected || conversationBlocked || isSending;
  const favoriteItemDisabled =
    !hasConversationSelected || isFavoriting;
  const blockItemDisabled =
    !hasConversationSelected || isBlocking;
  const clearItemDisabled =
    !hasConversationSelected || !conversationHasMessages || isClearing;
  const conversationActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={i18n.getMessage(
            "chat_actions_trigger_label",
            isLocalized,
          )}
          className="h-7 w-7 rounded-full"
          disabled={!hasConversationSelected}
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          {i18n.getMessage("chat_actions_label", isLocalized)}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={favoriteItemDisabled}
          onSelect={(event) => {
            event.preventDefault();
            handleToggleFavorite();
          }}
        >
          <Star className="mr-2 h-4 w-4" />
          <span>
            {i18n.getMessage(
              conversationFavorited
                ? "chat_action_remove_favorite"
                : "chat_action_add_favorite",
              isLocalized,
            )}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={blockItemDisabled}
          onSelect={(event) => {
            event.preventDefault();
            handleToggleBlock();
          }}
        >
          <Ban className="mr-2 h-4 w-4" />
          <span>
            {i18n.getMessage(
              conversationBlocked
                ? "chat_action_unblock"
                : "chat_action_block",
              isLocalized,
            )}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={clearItemDisabled}
          onSelect={(event) => {
            event.preventDefault();
            handleClearConversation();
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>{i18n.getMessage("chat_action_clear", isLocalized)}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Emit typing indicator via TanStack Query mutation (throttled) when enabled
  const { mutate: sendTypingMutation } = useTypingIndicator();
  useEffect(() => {
    if (
      !(sendTypingIndicator && selectedConversationId) ||
      conversationBlocked
    ) {
      return;
    }

    let lastSent = 0;
    let typingActive = false;
    let stopTimeout: ReturnType<typeof setTimeout> | undefined;

    const clearStopTimer = () => {
      if (stopTimeout) {
        window.clearTimeout(stopTimeout);
        stopTimeout = undefined;
      }
    };

    const emitTyping = (typingState: boolean) => {
      try {
        sendTypingMutation(
          {
            wa_id: selectedConversationId,
            typing: typingState,
          },
          {
            onError: (error) =>
              logSidebarWarning("Failed to dispatch typing indicator", error),
          }
        );
        typingActive = typingState;
        lastSent = Date.now();
      } catch (error) {
        logSidebarWarning("Editor typing throttler failed", error);
      }
    };

    const flushStop = () => {
      if (!typingActive) {
        return;
      }
      emitTyping(false);
    };

    const scheduleStop = () => {
      clearStopTimer();
      stopTimeout = window.setTimeout(() => {
        flushStop();
      }, TYPING_STOP_DEBOUNCE_MS);
    };

    const handleTypingStart = () => {
      const now = Date.now();
      if (!typingActive || now - lastSent >= TYPING_THROTTLE_MS) {
        emitTyping(true);
      }
      scheduleStop();
    };

    const handler = (e: Event) => {
      try {
        const eventType = (e as CustomEvent).detail?.type;
        if (eventType === "chat:editor_update") {
          handleTypingStart();
        }
      } catch (error) {
        logSidebarWarning("Editor event listener failed", error);
      }
    };

    window.addEventListener("chat:editor_event", handler as EventListener);

    return () => {
      window.removeEventListener("chat:editor_event", handler as EventListener);
      clearStopTimer();
      flushStop();
    };
  }, [
    conversationBlocked,
    sendTypingIndicator,
    selectedConversationId,
    sendTypingMutation,
  ]);

  const updateCustomerCache = useCallback(
    (
      waId: string,
      updater: (existing: CustomerName | undefined) => CustomerName,
    ) => {
      let updated = false;
      queryClient.setQueryData<Record<string, CustomerName> | undefined>(
        customerKeys.names(),
        (previous) => {
          if (!previous) {
            return previous;
          }
          updated = true;
          const next = { ...previous };
          next[waId] = updater(next[waId]);
          return next;
        },
      );
      if (!updated) {
        void queryClient.invalidateQueries({
          queryKey: customerKeys.names(),
          exact: true,
        });
      }
    },
    [queryClient],
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!selectedConversationId || isSystemAgentConversation) {
      return;
    }
    const waId = selectedConversationId;
    const nextValue = !conversationFavorited;
    setIsFavoriting(true);
    try {
      const response = await callPythonBackend<
        MutationResponse<{ wa_id: string; is_favorite: boolean }>
      >(`/customers/${encodeURIComponent(waId)}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: nextValue }),
      });
      if (!response?.success) {
        throw new Error(
          response?.message ||
            i18n.getMessage("chat_action_error", isLocalized),
        );
      }
      updateCustomerCache(waId, (existing) => ({
        ...(existing ?? {
          wa_id: waId,
          customer_name: currentCustomer?.customer_name ?? null,
        }),
        is_favorite: nextValue,
      }));
      toastService.success(
        i18n.getMessage(
          nextValue
            ? "chat_action_favorited"
            : "chat_action_unfavorited",
          isLocalized,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : i18n.getMessage("chat_action_error", isLocalized);
      toastService.error(message);
    } finally {
      setIsFavoriting(false);
    }
  }, [
    conversationFavorited,
    currentCustomer,
    isLocalized,
    isSystemAgentConversation,
    selectedConversationId,
    updateCustomerCache,
  ]);

  const handleToggleBlock = useCallback(async () => {
    if (!selectedConversationId || isSystemAgentConversation) {
      return;
    }
    const waId = selectedConversationId;
    const nextValue = !conversationBlocked;
    setIsBlocking(true);
    try {
      const response = await callPythonBackend<
        MutationResponse<{ wa_id: string; is_blocked: boolean }>
      >(`/customers/${encodeURIComponent(waId)}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: nextValue }),
      });
      if (!response?.success) {
        throw new Error(
          response?.message ||
            i18n.getMessage("chat_action_error", isLocalized),
        );
      }
      updateCustomerCache(waId, (existing) => ({
        ...(existing ?? {
          wa_id: waId,
          customer_name: currentCustomer?.customer_name ?? null,
        }),
        is_blocked: nextValue,
      }));
      toastService.success(
        i18n.getMessage(
          nextValue ? "chat_action_blocked" : "chat_action_unblocked",
          isLocalized,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : i18n.getMessage("chat_action_error", isLocalized);
      toastService.error(message);
    } finally {
      setIsBlocking(false);
    }
  }, [
    conversationBlocked,
    currentCustomer,
    isLocalized,
    isSystemAgentConversation,
    selectedConversationId,
    updateCustomerCache,
  ]);

  const handleClearConversation = useCallback(async () => {
    if (!selectedConversationId) {
      return;
    }
    const waId = selectedConversationId;
    setIsClearing(true);
    try {
      const response = await callPythonBackend<
        MutationResponse<{ deleted: number }>
      >(`/conversations/${encodeURIComponent(waId)}`, {
        method: "DELETE",
      });
      if (!response?.success) {
        throw new Error(
          response?.message ||
            i18n.getMessage("chat_action_error", isLocalized),
        );
      }
      queryClient.setQueryData<ConversationMessage[]>(
        chatKeys.messages(waId),
        () => [],
      );
      setAdditionalMessages((previous) => {
        if (!previous[waId]) {
          return previous;
        }
        return { ...previous, [waId]: [] };
      });
      setLoadedMessageCount(chatMessageLimit);
      toastService.success(
        i18n.getMessage("chat_action_cleared", isLocalized),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : i18n.getMessage("chat_action_error", isLocalized);
      toastService.error(message);
    } finally {
      setIsClearing(false);
    }
  }, [
    chatMessageLimit,
    isLocalized,
    queryClient,
    selectedConversationId,
    setAdditionalMessages,
  ]);

  if (!selectedConversationId) {
    return (
      <div className={cn("relative flex h-full flex-col bg-card", className)}>
        {/* Loading overlay with blur effect */}
        {isLoadingConversation && (
          <div className="chat-loading-overlay absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Spinner className="size-6 text-primary" />
              <p className="text-muted-foreground text-sm">
                {i18n.getMessage("chat_loading_conversation", isLocalized)}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        <div className="flex flex-1 items-center justify-center p-4 text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm">
              {shouldShowCombobox
                ? i18n.getMessage("chat_select_conversation", isLocalized)
                : i18n.getMessage("chat_no_conversations", isLocalized)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex h-full flex-col bg-card", className)}>
      {/* Loading overlay with blur effect */}
      {(isLoadingConversation || isLoadingConversationMessages) && (
        <div className="chat-loading-overlay absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="size-6 text-primary" />
            <p className="text-muted-foreground text-sm">
              {i18n.getMessage("chat_loading_conversation", isLocalized)}
            </p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="relative flex flex-1 flex-col">
        <ChatMessagesViewport
          isLocalized={isLocalized}
          isTyping={isTyping}
          loadMoreButton={
            hasMoreMessages && isAtTop ? (
              <div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-card to-transparent p-2">
                <Button
                  className="h-7 text-xs shadow-md"
                  onClick={handleLoadMore}
                  size="sm"
                  variant="outline"
                >
                  <ChevronUp className="mr-1 h-3 w-3" />
                  {i18n.getMessage("load_more", isLocalized)}
                  <span className="ml-1.5 opacity-70">
                    (+{chatMessageLimit})
                  </span>
                </Button>
              </div>
            ) : null
          }
          messageListRef={
            messageListRef as unknown as React.RefObject<HTMLDivElement>
          }
          messages={limitedMessages}
          messagesEndRef={
            messagesEndRef as unknown as React.RefObject<HTMLDivElement>
          }
          showToolCalls={showToolCalls}
        />
      </div>
      {/* Message Input - Sticky to bottom with background */}
      {/* Message Input - Sticky to bottom with background */}
      <div
        className="sticky bottom-0 border-sidebar-border border-t p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
        style={{
          backgroundColor: "hsl(var(--card))",
          background: "hsl(var(--card))",
          backdropFilter: "none",
          zIndex: "var(--z-chat-footer)",
        }}
      >
        <BasicChatInput
          actionSlot={conversationActions}
          disabled={composerDisabled}
          inactiveText={restrictionMessage}
          isInactive={Boolean(restrictionMessage)}
          isLocalized={isLocalized}
          isSending={isSending}
          maxCharacters={isSystemAgentConversation ? Infinity : undefined}
          onSend={handleSendMessage}
          placeholder={inputPlaceholder}
        />
      </div>
    </div>
  );
};
