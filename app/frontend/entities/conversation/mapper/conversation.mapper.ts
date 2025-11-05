import {
  ConversationDomain,
  type ConversationMessage,
} from "../core/conversation.domain";
import type { ConversationMessageDto } from "../infrastructure/dto/conversation.dto";

export function toDomain(
  waId: string,
  dtos: ConversationMessageDto[]
): ConversationDomain {
  return new ConversationDomain(waId, dtos as unknown as ConversationMessage[]);
}

export function toDto(
  messages: ConversationMessage[]
): ConversationMessageDto[] {
  return messages as unknown as ConversationMessageDto[];
}
