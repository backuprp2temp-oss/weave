// LLM Provider Abstraction Layer

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  model?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface LLMProvider {
  name: string;
  chatCompletion(
    messages: ChatMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse>;
  estimateTokenCount(text: string): number;
}

export type LLMProviderName = "openai" | "anthropic";

/**
 * Get configured LLM provider based on environment
 */
export async function getLLMProvider(
  providerName?: LLMProviderName
): Promise<LLMProvider> {
  const selectedProvider = providerName || getDefaultProvider();

  switch (selectedProvider) {
    case "openai":
      const { OpenAIProvider } = await import("./openai-provider");
      return OpenAIProvider;
    case "anthropic":
      const { AnthropicProvider } = await import("./anthropic-provider");
      return AnthropicProvider;
    default:
      throw new Error(`Unsupported LLM provider: ${selectedProvider}`);
  }
}

/**
 * Get default provider based on environment variables
 */
function getDefaultProvider(): LLMProviderName {
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return "anthropic";
  }
  throw new Error(
    "No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY"
  );
}

/**
 * Get available providers
 */
export function getAvailableProviders(): LLMProviderName[] {
  const providers: LLMProviderName[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  return providers;
}

/**
 * Check if provider is available
 */
export function isProviderAvailable(provider: LLMProviderName): boolean {
  switch (provider) {
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    default:
      return false;
  }
}
