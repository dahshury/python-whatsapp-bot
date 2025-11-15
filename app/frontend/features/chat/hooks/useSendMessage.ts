import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatKeys } from "@/shared/api/query-keys";
import type { ChatUseCase } from "../usecase/chat.usecase";

export const createUseSendMessage =
  (chat: ChatUseCase) => (conversationId: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
      mutationFn: (content: string) =>
        chat.sendMessage(conversationId, content),
      onSuccess: async () => {
        // Invalidate both conversation and messages queries to ensure UI updates
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
