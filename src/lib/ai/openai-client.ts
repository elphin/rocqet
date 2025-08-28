/**
 * Custom OpenAI Client
 * Enterprise-grade implementation without external SDK dependencies
 * Solves Zod version conflicts and provides better control
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  stop?: string | string[];
  n?: number;
  functions?: Array<{
    name: string;
    description?: string;
    parameters?: any;
  }>;
  function_call?: 'none' | 'auto' | { name: string };
  response_format?: { type: 'text' | 'json_object' };
}

interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface EmbeddingRequest {
  model: string;
  input: string | string[];
  encoding_format?: 'float' | 'base64';
}

interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface ModelsResponse {
  object: string;
  data: Model[];
}

export class OpenAIClient {
  private apiKey: string;
  private baseURL: string;
  private organization?: string;
  private defaultHeaders: HeadersInit;

  constructor(config: {
    apiKey: string;
    baseURL?: string;
    organization?: string;
    defaultHeaders?: HeadersInit;
  }) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.organization = config.organization;
    
    this.defaultHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };

    if (this.organization) {
      this.defaultHeaders['OpenAI-Organization'] = this.organization;
    }
  }

  async createChatCompletion(params: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.baseURL}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async *createChatCompletionStream(params: ChatCompletionRequest): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseURL}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({ ...params, stream: true }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  async createEmbedding(params: EmbeddingRequest): Promise<EmbeddingResponse> {
    const url = `${this.baseURL}/embeddings`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async listModels(): Promise<ModelsResponse> {
    const url = `${this.baseURL}/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.defaultHeaders,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  // Compatibility layer to match OpenAI SDK interface
  get chat() {
    return {
      completions: {
        create: (params: ChatCompletionRequest) => this.createChatCompletion(params),
      }
    };
  }

  get embeddings() {
    return {
      create: (params: EmbeddingRequest) => this.createEmbedding(params),
    };
  }

  get models() {
    return {
      list: () => this.listModels(),
    };
  }
}

// Export a default instance creator for compatibility
export default function createOpenAIClient(config: {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  defaultHeaders?: HeadersInit;
}) {
  return new OpenAIClient(config);
}

// Export types for external use
export type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChoice,
  EmbeddingRequest,
  EmbeddingResponse,
  Model,
  ModelsResponse
};