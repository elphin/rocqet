/**
 * AI Service - Handles communication with AI providers (OpenAI, Anthropic, etc.)
 */

import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

export interface AIProvider {
  type: 'openai' | 'anthropic' | 'claude';
  apiKey: string;
  model?: string;
}

export interface PromptExecutionOptions {
  prompt: string;
  variables: Record<string, any>;
  provider: AIProvider;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface PromptExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
}

export class AIService {
  private openaiClient: OpenAI | null = null;

  /**
   * Initialize AI clients with API keys
   */
  private async initializeClients(provider: AIProvider) {
    if (provider.type === 'openai' && !this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: provider.apiKey,
      });
    }
    
    // Add Anthropic client initialization here when needed
  }

  /**
   * Execute a prompt with the specified AI provider
   */
  async executePrompt(options: PromptExecutionOptions): Promise<PromptExecutionResult> {
    try {
      // Substitute variables in the prompt
      let finalPrompt = options.prompt;
      for (const [key, value] of Object.entries(options.variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        finalPrompt = finalPrompt.replace(regex, String(value));
      }

      // Initialize the appropriate client
      await this.initializeClients(options.provider);

      // Execute based on provider
      switch (options.provider.type) {
        case 'openai':
          return await this.executeOpenAIPrompt(finalPrompt, options);
        
        case 'anthropic':
        case 'claude':
          return await this.executeAnthropicPrompt(finalPrompt, options);
        
        default:
          throw new Error(`Unsupported AI provider: ${options.provider.type}`);
      }
    } catch (error: any) {
      console.error('AI execution error:', error);
      return {
        success: false,
        error: error.message || 'Failed to execute prompt',
        provider: options.provider.type,
        model: options.provider.model || 'unknown'
      };
    }
  }

  /**
   * Execute prompt with OpenAI
   */
  private async executeOpenAIPrompt(
    prompt: string, 
    options: PromptExecutionOptions
  ): Promise<PromptExecutionResult> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const messages: any[] = [];
      
      // Add system prompt if provided
      if (options.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      }
      
      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      const completion = await this.openaiClient.chat.completions.create({
        model: options.provider.model || 'gpt-4-turbo-preview',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
      });

      const output = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      return {
        success: true,
        output,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        } : undefined,
        provider: 'openai',
        model: completion.model
      };
    } catch (error: any) {
      // Handle specific OpenAI errors
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded');
      } else if (error.status === 503) {
        throw new Error('OpenAI service temporarily unavailable');
      }
      
      throw error;
    }
  }

  /**
   * Execute prompt with Anthropic/Claude
   */
  private async executeAnthropicPrompt(
    prompt: string, 
    options: PromptExecutionOptions
  ): Promise<PromptExecutionResult> {
    // For now, return a mock response
    // In production, integrate with Anthropic SDK
    
    return {
      success: true,
      output: `[Claude Response - Mock]\n\nProcessed prompt with variables:\n${prompt}\n\nThis is a simulated response. Please configure Anthropic API integration.`,
      provider: 'anthropic',
      model: options.provider.model || 'claude-3-opus-20240229',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    };
  }

  /**
   * Get the user's API key for a specific provider
   */
  static async getUserAPIKey(
    workspaceId: string, 
    provider: string
  ): Promise<string | null> {
    const supabase = await createClient();
    
    // First check workspace API keys
    const { data: workspaceKey } = await supabase
      .from('workspace_api_keys')
      .select('decrypted_key')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (workspaceKey?.decrypted_key) {
      return workspaceKey.decrypted_key;
    }

    // Fallback to environment variable (for testing)
    if (provider === 'openai') {
      return process.env.OPENAI_API_KEY || null;
    } else if (provider === 'anthropic' || provider === 'claude') {
      return process.env.ANTHROPIC_API_KEY || null;
    }

    return null;
  }

  /**
   * Validate an API key by making a test request
   */
  static async validateAPIKey(
    provider: string, 
    apiKey: string
  ): Promise<boolean> {
    const service = new AIService();
    
    try {
      const result = await service.executePrompt({
        prompt: 'Say "Hello"',
        variables: {},
        provider: {
          type: provider as any,
          apiKey
        },
        maxTokens: 10
      });
      
      return result.success;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  /**
   * Get available models for a provider
   */
  static getAvailableModels(provider: string): string[] {
    switch (provider) {
      case 'openai':
        return [
          'gpt-4-turbo-preview',
          'gpt-4-1106-preview',
          'gpt-4',
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k'
        ];
      
      case 'anthropic':
      case 'claude':
        return [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
          'claude-2.0'
        ];
      
      default:
        return [];
    }
  }

  /**
   * Estimate token count for a text
   */
  static estimateTokens(text: string): number {
    // Rough estimate: 1 token ~= 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost based on usage
   */
  static calculateCost(
    usage: { promptTokens: number; completionTokens: number },
    provider: string,
    model: string
  ): number {
    // Pricing per 1K tokens (in USD)
    const pricing: Record<string, Record<string, { input: number; output: number }>> = {
      openai: {
        'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
      },
      anthropic: {
        'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
        'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
      }
    };

    const modelPricing = pricing[provider]?.[model];
    if (!modelPricing) return 0;

    const inputCost = (usage.promptTokens / 1000) * modelPricing.input;
    const outputCost = (usage.completionTokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }
}

// Export singleton instance
export const aiService = new AIService();