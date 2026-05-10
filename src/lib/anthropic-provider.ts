import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage, LLMOptions, LLMProvider, LLMResponse } from "@/lib/llm";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-3-sonnet-20240229";

/**
 * Rough token estimation (Anthropic's tokenizer is different)
 * Approximation: 1 token ≈ 4 characters
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export const AnthropicProvider: LLMProvider = {
  name: "anthropic",

  async chatCompletion(
    messages: ChatMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    const model = options?.model || DEFAULT_MODEL;
    const temperature = options?.temperature ?? 0.3;
    const maxTokens = options?.maxTokens || 4096;

    // Separate system message from conversation
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Anthropic requires system prompt as separate parameter
    const response = await anthropic.messages.create({
      model,
      system: systemMessage?.content,
      messages: conversationMessages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
      temperature,
      max_tokens: maxTokens,
      top_p: options?.topP,
    });

    // Extract content from response
    const contentBlocks = response.content.filter(
      (block) => block.type === "text"
    );
    const content = contentBlocks
      .map((block) => (block as any).text)
      .join("\n");

    return {
      content,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason || undefined,
    };
  },

  estimateTokenCount,
};
