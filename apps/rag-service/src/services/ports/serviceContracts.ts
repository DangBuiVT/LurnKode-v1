import type { Rating, StoredConversation, StoredMessage, TutorReply } from "../../domain/conversation.ts";
import type { CitationSource } from "../../domain/citation.ts";
import type { ParserRegistry } from "./documentParser.ts";
import type { DocumentChunker } from "./chunker.ts";
import type { MaterialClient, CourseAccessClient } from "./lmsClient.ts";
import type { EmbeddingProvider } from "./embeddingProvider.ts";
import type { LLMProvider } from "./llmProvider.ts";
import type { VectorStore } from "./vectorStore.ts";
import type { ConversationRepository } from "./conversationRepository.ts";
import type { RetrievalInput, RetrievalResult } from "../../domain/retrieval.ts";

export interface RetrievalDependencies {
  access: CourseAccessClient;
  embeddings: EmbeddingProvider;
  vectors: Pick<VectorStore, "search">;
}
export interface RetrievalService {
  retrieve(input: RetrievalInput): Promise<RetrievalResult>;
}

export interface IndexResult { status: "indexed" | "unchanged" | "skipped"; chunks: number }
export interface IngestionDependencies {
  materials: MaterialClient;
  embeddings: EmbeddingProvider;
  vectors: VectorStore;
  parsers: ParserRegistry;
  chunker: DocumentChunker;
}
export interface IngestionService {
  ingestDocument(materialId: string): Promise<IndexResult>;
}
export interface ChatDependencies {
  access: CourseAccessClient;
  embeddings: EmbeddingProvider;
  vectors: VectorStore;
  generator: LLMProvider;
  conversations: ConversationRepository;
}
export interface ChatService {
  createConversation(learnerId: string, courseId: string, title: string | null): Promise<StoredConversation>;
  listConversations(learnerId: string): Promise<StoredConversation[]>;
  ownedConversation(learnerId: string, conversationId: string): Promise<StoredConversation>;
  archiveConversation(learnerId: string, conversationId: string): Promise<void>;
  listConversationMessages(learnerId: string, conversationId: string): Promise<StoredMessage[]>;
  answerQuestion(input: { learnerId: string; conversationId: string; question: string }): Promise<TutorReply>;
  rateAnswer(learnerId: string, messageId: string, rating: Rating): Promise<void>;
  getCitationSource(learnerId: string, messageId: string, chunkId: string): Promise<CitationSource>;
}
