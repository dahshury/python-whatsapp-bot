import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConversationMessage } from "@/entities/conversation";
import { chatKeys } from "@/shared/api/query-keys";
import type { ChatMessageDto, ChatUseCase } from "../usecase/chat.usecase";

export const createUseSendMessage =
  (chat: ChatUseCase) => (conversationId: string) => {
    const queryClient = useQueryClient();

    const formatDate = (date: Date) => {
      try {
        return date.toISOString().slice(0, 10);
      } catch {
        return new Date().toISOString().slice(0, 10);
      }
    };

    const formatTime = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const mutation = useMutation<
      ChatMessageDto,
      unknown,
      string,
      { previousMessages?: ConversationMessage[] }
    >({
      mutationFn: (content: string) =>
        chat.sendMessage(conversationId, content),
      onMutate: async (content: string) => {
        if (!conversationId) {
          return {};
        }

        await queryClient.cancelQueries({
          queryKey: chatKeys.messages(conversationId),
        });

        const previousMessages = queryClient.getQueryData<
          ConversationMessage[]
        >(chatKeys.messages(conversationId));

        const now = new Date();
        const optimisticMessage: ConversationMessage = {
          role: "secretary",
          message: content,
          date: formatDate(now),
          time: formatTime(now),
        };

        queryClient.setQueryData<ConversationMessage[]>(
          chatKeys.messages(conversationId),
          [...(previousMessages ?? []), optimisticMessage]
        );

        return previousMessages ? { previousMessages } : {};
      },
      onError: (_error, _content, context) => {
        if (!conversationId) {
          return;
        }

        if (context?.previousMessages !== undefined) {
          queryClient.setQueryData(
            chatKeys.messages(conversationId),
            context.previousMessages
          );
        } else {
          queryClient.removeQueries({
            queryKey: chatKeys.messages(conversationId),
            exact: true,
          });
        }
      },
      onSettled: async () => {
        if (!conversationId) {
          return;
        }
        // Ensure both conversation metadata and message history stay in sync
        await queryClient.invalidateQueries({
          queryKey: chatKeys.conversation(conversationId),
        });
        await queryClient.invalidateQueries({
          queryKey: chatKeys.messages(conversationId),
        });
      },
    });

    return {
      sendMessage: mutation.mutateAsync,
      isPending: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    } as const;
  };
