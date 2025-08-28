// AI Provider configurations and available models

// Note: Model list last updated: December 2024
// TODO: Implement automatic model discovery via provider APIs
// TODO: Replace emoji icons with professional SVG components

export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: 'openai', // Will be replaced with SVG component
    iconColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Omni)', maxTokens: 128000, tier: 'flagship' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini', maxTokens: 128000, tier: 'efficient' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', maxTokens: 128000, tier: 'powerful' },
      { value: 'gpt-4', label: 'GPT-4', maxTokens: 8192, tier: 'legacy' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', maxTokens: 16385, tier: 'fast' },
      // Note: GPT-5 not yet publicly available as of Dec 2024
    ],
    settings: {
      temperature: { min: 0, max: 2, default: 0.7, step: 0.1 },
      maxTokens: { min: 1, max: 128000, default: 2000 },
      topP: { min: 0, max: 1, default: 1, step: 0.01 },
      frequencyPenalty: { min: -2, max: 2, default: 0, step: 0.1 },
      presencePenalty: { min: -2, max: 2, default: 0, step: 0.1 },
    }
  },
  anthropic: {
    name: 'Anthropic',
    icon: 'anthropic', // Will be replaced with SVG component
    iconColor: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', maxTokens: 200000, tier: 'flagship' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', maxTokens: 200000, tier: 'powerful' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', maxTokens: 200000, tier: 'balanced' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', maxTokens: 200000, tier: 'fast' },
    ],
    settings: {
      temperature: { min: 0, max: 1, default: 0.7, step: 0.1 },
      maxTokens: { min: 1, max: 200000, default: 2000 },
      topP: { min: 0, max: 1, default: 1, step: 0.01 },
      topK: { min: 1, max: 100, default: 40, step: 1 },
    }
  },
  google: {
    name: 'Google AI',
    icon: 'google', // Will be replaced with SVG component
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    models: [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)', maxTokens: 1048576, tier: 'flagship' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', maxTokens: 2097152, tier: 'powerful' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', maxTokens: 1048576, tier: 'fast' },
      { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', maxTokens: 1048576, tier: 'efficient' },
    ],
    settings: {
      temperature: { min: 0, max: 1, default: 0.7, step: 0.1 },
      maxTokens: { min: 1, max: 30720, default: 2000 },
      topP: { min: 0, max: 1, default: 0.95, step: 0.01 },
      topK: { min: 1, max: 40, default: 40, step: 1 },
    }
  },
  cohere: {
    name: 'Cohere',
    icon: 'cohere', // Will be replaced with SVG component
    iconColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    models: [
      { value: 'command', label: 'Command', maxTokens: 4096 },
      { value: 'command-light', label: 'Command Light', maxTokens: 4096 },
      { value: 'command-nightly', label: 'Command Nightly', maxTokens: 4096 },
    ],
    settings: {
      temperature: { min: 0, max: 5, default: 0.7, step: 0.1 },
      maxTokens: { min: 1, max: 4096, default: 1000 },
      topP: { min: 0, max: 1, default: 0.75, step: 0.01 },
      topK: { min: 0, max: 500, default: 0, step: 1 },
      frequencyPenalty: { min: 0, max: 1, default: 0, step: 0.1 },
      presencePenalty: { min: 0, max: 1, default: 0, step: 0.1 },
    }
  },
  mistral: {
    name: 'Mistral AI',
    icon: 'mistral', // Will be replaced with SVG component
    iconColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    models: [
      { value: 'mistral-large-latest', label: 'Mistral Large', maxTokens: 32000 },
      { value: 'mistral-medium-latest', label: 'Mistral Medium', maxTokens: 32000 },
      { value: 'mistral-small-latest', label: 'Mistral Small', maxTokens: 32000 },
      { value: 'mistral-tiny', label: 'Mistral Tiny', maxTokens: 32000 },
    ],
    settings: {
      temperature: { min: 0, max: 1, default: 0.7, step: 0.01 },
      maxTokens: { min: 1, max: 32000, default: 2000 },
      topP: { min: 0, max: 1, default: 1, step: 0.01 },
    }
  },
  perplexity: {
    name: 'Perplexity',
    icon: 'perplexity', // Will be replaced with SVG component
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    models: [
      { value: 'pplx-70b-online', label: 'Perplexity 70B Online', maxTokens: 4096 },
      { value: 'pplx-7b-online', label: 'Perplexity 7B Online', maxTokens: 4096 },
      { value: 'pplx-70b-chat', label: 'Perplexity 70B Chat', maxTokens: 4096 },
      { value: 'pplx-7b-chat', label: 'Perplexity 7B Chat', maxTokens: 4096 },
    ],
    settings: {
      temperature: { min: 0, max: 2, default: 0.7, step: 0.1 },
      maxTokens: { min: 1, max: 4096, default: 1000 },
      topP: { min: 0, max: 1, default: 1, step: 0.01 },
      topK: { min: 1, max: 100, default: 40, step: 1 },
    }
  },
  groq: {
    name: 'Groq',
    icon: 'groq', // Will be replaced with SVG component
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    models: [
      { value: 'llama2-70b-4096', label: 'Llama 2 70B', maxTokens: 4096 },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', maxTokens: 32768 },
      { value: 'gemma-7b-it', label: 'Gemma 7B', maxTokens: 8192 },
    ],
    settings: {
      temperature: { min: 0, max: 2, default: 0.7, step: 0.1 },
      maxTokens: { min: 1, max: 32768, default: 2000 },
      topP: { min: 0, max: 1, default: 1, step: 0.01 },
    }
  }
} as const;

export type AIProvider = keyof typeof AI_PROVIDERS;
export type AIModel = typeof AI_PROVIDERS[AIProvider]['models'][number];

export function getProviderFromModel(modelId: string): AIProvider | null {
  for (const [provider, config] of Object.entries(AI_PROVIDERS)) {
    if (config.models.some(m => m.value === modelId)) {
      return provider as AIProvider;
    }
  }
  return null;
}