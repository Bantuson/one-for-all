import 'server-only'
import OpenAI from 'openai'

/**
 * DeepSeek client for LLM-based extraction refinement.
 *
 * DeepSeek is OpenAI-compatible, so we use the openai SDK.
 * Only initialized if DEEPSEEK_API_KEY is set.
 * Used by the hybrid scanner to enhance regex extraction results.
 */
export const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    })
  : null

// Legacy export for compatibility
export const openai = deepseek

/**
 * Check if DeepSeek is available for LLM refinement
 */
export function isOpenAIAvailable(): boolean {
  return deepseek !== null
}

export function isDeepSeekAvailable(): boolean {
  return deepseek !== null
}
