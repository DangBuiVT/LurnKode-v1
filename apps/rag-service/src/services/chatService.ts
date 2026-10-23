import type { RagConfig } from "../config.ts";
import type { Rating, StoredConversation, StoredMessage, TutorReply } from "../domain/conversation.ts";
import type { Citation, CitationSource } from "../domain/citation.ts";
import type { SearchHit } from "../domain/retrieval.ts";
import type { ChatDependencies, ChatService } from "./ports/serviceContracts.ts";
import { NotImplemented } from "../domain/errors.ts";

export function createChatService(ports: ChatDependencies, config: RagConfig): ChatService {
  // TODO: Bind các hàm nghiệp vụ với dependencies, không đưa repository ra HTTP layer.
  throw new NotImplemented("createChatService");
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
  // TODO: Không tồn tại/archived/khác owner -> MissingResource; mất quyền -> AccessDenied.
  throw new NotImplemented("ownedConversation");
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
  // TODO: Kiểm tra câu hỏi; identity phải được xác thực server-side trước khi gọi.
  // TODO: ownedConversation -> kiểm tra lại quyền course -> embed câu hỏi.
  // TODO: Retrieval chỉ trong authorized course và active source version.
  // TODO: Không đủ bằng chứng -> out_of_scope, citations=[]; vẫn lưu refusal.
  // TODO: Cô lập nội dung không tin cậy trong prompt, gọi generator qua port.
  // TODO: Kiểm tra citation; lưu user+assistant+citations atomically qua saveExchange.
  throw new NotImplemented("answerQuestion");
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

export function verifiedCitations(hits: readonly SearchHit[], claimedIds: readonly string[]): Citation[] | null {
  // TODO: Loại ID trùng; trả null nếu không có ID hoặc bất kỳ ID nào ngoài hits.
  // TODO: Dựng citation từ metadata của retrieved chunks, gồm location nếu có.
  // TODO: Không tin URL/metadata LLM tự tạo. ID hợp lệ chưa chứng minh groundedness.
  throw new NotImplemented("verifiedCitations");
}
