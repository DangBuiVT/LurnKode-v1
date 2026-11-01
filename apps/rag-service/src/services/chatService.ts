import type { RagConfig } from "../config.ts";
import type { Rating, StoredConversation, StoredMessage, TutorReply } from "../domain/conversation.ts";
import type { CitationSource } from "../domain/citation.ts";
import type { ChatDependencies, ChatService } from "./ports/serviceContracts.ts";
import { AccessDenied, MissingResource, NotImplemented } from "../domain/errors.ts";
import { validateExternalId } from "./validation.ts";
import { answerCourseQuestion } from "./answerService.ts";
import { createRetrievalService } from "./retrievalService.ts";
export { verifiedCitations } from "./answerService.ts";

export function createChatService(ports: ChatDependencies, config: RagConfig): ChatService {
  const snapshot = { ...config };
  return {
    listConversations: learnerId => listConversations(ports, learnerId),
    createConversation: (learnerId, courseId, title) => createConversation(ports, learnerId, courseId, title),
    ownedConversation: (learnerId, conversationId) => ownedConversation(ports, learnerId, conversationId),
    archiveConversation: (learnerId, conversationId) => archiveConversation(ports, learnerId, conversationId),
    listConversationMessages: (learnerId, conversationId) => listConversationMessages(ports, learnerId, conversationId),
    answerQuestion: input => answerQuestion(input, ports, snapshot),
    rateAnswer: (learnerId, messageId, rating) => rateAnswer(ports, learnerId, messageId, rating),
    getCitationSource: (learnerId, messageId, chunkId) => getCitationSource(ports, learnerId, messageId, chunkId),
  };
}
export async function listConversations(ports: ChatDependencies, learnerId: string): Promise<StoredConversation[]> {
  // TODO: Chỉ đọc hội thoại của learner đã xác thực; thêm pagination.
  throw new NotImplemented("listConversations");
}

export async function createConversation(ports: ChatDependencies, learnerId: string, courseId: string, title: string | null): Promise<StoredConversation> {
  // TODO: Xác nhận quyền course rồi mới tạo conversation; learnerId lấy từ identity tin cậy.
  throw new NotImplemented("createConversation");
}
export async function ownedConversation(ports: ChatDependencies, learnerId: string, conversationId: string): Promise<StoredConversation> {
  const learner = validateExternalId(learnerId);
  const id = validateExternalId(conversationId);
  const conversation = await ports.conversations.get(id);
  if (!conversation || conversation.id !== id || conversation.archived || conversation.learnerId !== learner) {
    throw new MissingResource();
  }
  if (!await ports.access.canAskCourse(learner, conversation.courseId)) throw new AccessDenied();
  return conversation;
}
export async function archiveConversation(ports: ChatDependencies, learnerId: string, conversationId: string): Promise<void> {
  // TODO: Kiểm tra ownership và quyền course trước khi archive theo retention policy.
  throw new NotImplemented("archiveConversation");
}
export async function listConversationMessages(ports: ChatDependencies, learnerId: string, conversationId: string): Promise<StoredMessage[]> {
  // TODO: Kiểm tra ownership/quyền rồi đọc lịch sử và citation snapshots; thêm pagination.
  throw new NotImplemented("listConversationMessages");
}

export async function answerQuestion(input: { learnerId: string; conversationId: string; question: string }, ports: ChatDependencies, config: RagConfig): Promise<TutorReply> {
  const conversation = await ownedConversation(ports, input.learnerId, input.conversationId);
  const result = await answerCourseQuestion({ learnerId: input.learnerId, courseId: conversation.courseId, question: input.question }, {
    retrieval: createRetrievalService(ports, config), generator: ports.generator,
  });
  return ports.conversations.saveExchange({
    conversationId: conversation.id, question: result.question, answer: result.answer,
    status: result.status, citations: result.citations,
  });
}

export async function rateAnswer(ports: ChatDependencies, learnerId: string, messageId: string, rating: Rating): Promise<void> {
  // TODO: Kiểm tra rating hợp lệ, message thuộc assistant và conversation thuộc learner.
  // TODO: Kiểm tra quyền course hiện tại trước khi lưu; không xem feedback là fine-tuning.
  throw new NotImplemented("rateAnswer");
}

export async function getCitationSource(ports: ChatDependencies, learnerId: string, messageId: string, chunkId: string): Promise<CitationSource> {
  // TODO: Kiểm tra message thuộc assistant.
  // TODO: Kiểm tra ownership và quyền khóa học.
  // TODO: Xác nhận chunkId nằm trong citations của message.
  // TODO: Đọc chunk lịch sử, trả text và metadata.
  throw new NotImplemented("getCitationSource");
}
