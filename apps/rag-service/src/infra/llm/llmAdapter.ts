import type { LLMProvider } from "../../services/ports/llmProvider.ts";
import { NotImplemented } from "../../domain/errors.ts";

export const llmAdapter: LLMProvider = {
  async generate(input) {
    // TODO: Gọi model với context không tin cậy được cô lập; timeout và output schema.
    // TODO: Trả answer + citedChunkIds; service xác minh IDs và grounding.
    throw new NotImplemented("llmAdapter.generate");
  },
};
