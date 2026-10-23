import type { Rating, StoredConversation, StoredMessage, TutorReply, AnswerStatus } from "../../domain/conversation.ts";
import type { Citation } from "../../domain/citation.ts";

export interface ConversationRepository {
  create(learnerId: string, courseId: string, title: string | null): Promise<StoredConversation>;
  list(learnerId: string, courseId?: string): Promise<StoredConversation[]>;
  get(id: string): Promise<StoredConversation | null>;
  archive(id: string): Promise<void>;
  listMessages(conversationId: string): Promise<StoredMessage[]>;
  getMessage(messageId: string): Promise<StoredMessage | null>;
  /** User + assistant + citations phải được lưu trong cùng transaction. */
  saveExchange(input: { conversationId: string; question: string; answer: string; status: AnswerStatus; citations: Citation[] }): Promise<TutorReply>;
  setRating(messageId: string, rating: Rating): Promise<void>;
}
