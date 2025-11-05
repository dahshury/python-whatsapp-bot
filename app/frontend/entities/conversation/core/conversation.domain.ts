import { WhatsAppId } from "@/shared/domain/value-objects/wa-id.vo";
import type { ConversationMessage } from "../types/conversation.types";
import { MessageRole, MessageText } from "../value-objects";

export class ConversationDomain {
  private readonly _waId: WhatsAppId;
  private _messages: ConversationMessage[];

  constructor(waId: string, messages: ConversationMessage[] = []) {
    this._waId = new WhatsAppId(waId);
    this._messages = this.validateMessages(messages);
  }

  private validateMessages(
    messages: ConversationMessage[]
  ): ConversationMessage[] {
    return messages.map((msg) => {
      // Validate message through VOs
      new MessageText(msg.message);
      new MessageRole(msg.role as "user" | "assistant" | "system" | "tool");
      return msg;
    });
  }

  append(message: ConversationMessage): void {
    // Validate new message
    new MessageText(message.message);
    new MessageRole(message.role as "user" | "assistant" | "system" | "tool");
    this._messages = [...this._messages, message];
  }

  clear(): void {
    this._messages = [];
  }

  getLastMessage(): ConversationMessage | undefined {
    return this._messages.at(-1);
  }

  getMessageCount(): number {
    return this._messages.length;
  }

  getMessagesByRole(role: string): ConversationMessage[] {
    return this._messages.filter((msg) => msg.role === role);
  }

  hasMessages(): boolean {
    return this._messages.length > 0;
  }

  removeLastMessage(): void {
    if (this._messages.length > 0) {
      this._messages = this._messages.slice(0, -1);
    }
  }

  get waId(): string {
    return this._waId.value;
  }

  get messages(): ConversationMessage[] {
    return this._messages;
  }
}

export type {
  ConversationMessage,
  Conversations,
} from "../types/conversation.types";
