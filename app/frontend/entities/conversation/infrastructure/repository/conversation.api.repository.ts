import type { ConversationDomain } from "../../core/conversation.domain";
import type { ConversationRepository } from "../../core/conversation.repository";
import { toDomain, toDto } from "../../mapper/conversation.mapper";
import { ConversationAdapter } from "../api/conversation.adapter";

export class ConversationApiRepository implements ConversationRepository {
  private readonly adapter = ConversationAdapter();

  async getByWaId(waId: string): Promise<ConversationDomain | null> {
    const dtos = await this.adapter.getByWaId(waId);
    return toDomain(waId, dtos);
  }

  async save(waId: string, conversation: ConversationDomain): Promise<void> {
    const dtos = toDto(conversation.messages);
    await this.adapter.save(waId, dtos);
  }
}
