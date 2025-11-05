import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChatUseCase } from "../usecase/chat.usecase";

export const createUseSendMessage =
  (chat: ChatUseCase) => (conversationId: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
      mutationFn: (content: string) =>
        chat.sendMessage(conversationId, content),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ["chat", conversationId],
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
