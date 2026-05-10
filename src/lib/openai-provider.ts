import OpenAI from "openai";
import { ChatMessage, LLMOptions, LLMProvider, LLMResponse } from "@/lib/llm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo";

/**
 * Rough token estimation (1 token ≈ 4 characters for English text)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export const OpenAIProvider: LLMProvider = {
  name: "openai",

  async chatCompletion(
    messages: ChatMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    const model = options?.model || DEFAULT_MODEL;
    const temperature = options?.temperature ?? 0.3;
    const maxTokens = options?.maxTokens || 4096;

    const response = await openai.chat.completions.create({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
      max_tokens: maxTokens,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stop,
    });

    const choice = response.choices[0];
    const content = choice.message?.content || "";

    return {
      content,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason || undefined,
    };
  },

  estimateTokenCount,
};
