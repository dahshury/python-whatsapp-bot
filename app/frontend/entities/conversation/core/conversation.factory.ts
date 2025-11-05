import { BaseError } from "@/shared/libs/errors/base-error";
import {
  ConversationDomain,
  type ConversationMessage,
} from "./conversation.domain";

export function createNewConversation(waId: string): ConversationDomain {
  if (!waId?.trim()) {
    throw BaseError.validation(
      "WhatsApp ID is required to create a conversation"
    );
  }
  return new ConversationDomain(waId, []);
}

export function createConversationFromMessages(
  waId: string,
  messages: ConversationMessage[]
): ConversationDomain {
  if (!waId?.trim()) {
    throw BaseError.validation(
      "WhatsApp ID is required to create a conversation"
    );
  }
  if (!Array.isArray(messages)) {
    throw BaseError.validation("Messages must be an array");
  }
  return new ConversationDomain(waId, messages);
}

export function createConversationFromDto(dto: unknown): ConversationDomain {
  const data = dto as { waId?: string; messages?: ConversationMessage[] };

  if (!data.waId) {
    throw BaseError.validation("Invalid conversation DTO: missing waId");
  }

  return new ConversationDomain(
    data.waId,
    Array.isArray(data.messages) ? data.messages : []
  );
}
