import type { Elysia } from "elysia";
import type { RagConfig } from "./config.ts";
import type { IngestionService, ChatService } from "./services/ports/serviceContracts.ts";
import type { IdentityVerifier } from "./services/ports/lmsClient.ts";
import { NotImplemented } from "./domain/errors.ts";

export function createRagApp(services: { ingestion: IngestionService; chat: ChatService }, identity: IdentityVerifier, config: RagConfig, internalKey: string): Elysia {
  // TODO: Tạo Elysia routes conversations/messages/feedback và internal indexing.
  // TODO: Kiểm tra schema; xác thực Bearer qua identity, không lấy userId/role từ body.
  // TODO: Internal service key chỉ bảo vệ indexing, không thay learner auth.
  // TODO: Gọi services.ingestion/services.chat và chuyển kết quả thành response.
  // TODO: Quyền course và ownership vẫn phải kiểm tra trong services.
  // TODO: Thêm error envelope dùng chung và health route khi server thực sự hoạt động.
  // TODO: Không đặt nghiệp vụ RAG hoặc SQL trong app.ts.
  throw new NotImplemented("createRagApp");
}
