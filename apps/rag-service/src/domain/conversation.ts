import type { Citation } from "./citation.ts";

export type Rating = "helpful" | "unhelpful";
export type AnswerStatus = "answered" | "out_of_scope";

export interface StoredConversation {
  id: string;
  learnerId: string;
  courseId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}
export interface StoredMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  status: AnswerStatus | null;
  citations: Citation[];
  rating: Rating | null;
  createdAt: string;
}
export interface TutorReply {
  message: StoredMessage;
  citations: Citation[];
}
