/**
 * Static fallback pricing for popular Together AI models.
 * Sourced from together.ai/pricing — no API key needed for these.
 * Prices are per 1M tokens (input/output).
 *
 * Last updated: 2026-04-08
 */

export interface StaticTogetherPrice {
  input_per_million: number;
  output_per_million: number;
  currency: string;
}

export const STATIC_TOGETHER_PRICING: Record<string, StaticTogetherPrice> = {
  // ─── Frontier / Large ────────────────────────────────────────────
  "meta-llama/Llama-3.3-70B-Instruct-Turbo": {
    input_per_million: 0.88,
    output_per_million: 0.88,
    currency: "USD",
  },
  "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": {
    input_per_million: 0.27,
    output_per_million: 0.85,
    currency: "USD",
  },
  "meta-llama/Llama-4-Scout-17B-16E-Instruct": {
    input_per_million: 0.18,
    output_per_million: 0.59,
    currency: "USD",
  },
  "deepseek-ai/DeepSeek-V3": {
    input_per_million: 0.60,
    output_per_million: 1.70,
    currency: "USD",
  },
  "deepseek-ai/DeepSeek-R1": {
    input_per_million: 3.00,
    output_per_million: 7.00,
    currency: "USD",
  },
  "Qwen/Qwen2.5-72B-Instruct-Turbo": {
    input_per_million: 1.20,
    output_per_million: 1.80,
    currency: "USD",
  },
  "mistralai/Mistral-Small-24B-Instruct-2501": {
    input_per_million: 0.10,
    output_per_million: 0.30,
    currency: "USD",
  },
  "google/gemma-2-27b-it": {
    input_per_million: 0.80,
    output_per_million: 0.80,
    currency: "USD",
  },

  // ─── Small / Fast ────────────────────────────────────────────────
  "meta-llama/Llama-3.2-3B-Instruct-Turbo": {
    input_per_million: 0.06,
    output_per_million: 0.06,
    currency: "USD",
  },
  "Qwen/Qwen2.5-7B-Instruct-Turbo": {
    input_per_million: 0.30,
    output_per_million: 0.30,
    currency: "USD",
  },
  "google/gemma-2-9b-it": {
    input_per_million: 0.30,
    output_per_million: 0.30,
    currency: "USD",
  },

  // ─── Image ───────────────────────────────────────────────────────
  "black-forest-labs/FLUX.1-schnell-Free": {
    input_per_million: 0,
    output_per_million: 0,
    currency: "USD",
  },
};
