/**
 * Static fallback pricing for popular Fireworks AI models.
 * Sourced from fireworks.ai/pricing — no API key needed for these.
 * Prices are per 1M tokens (input/output).
 *
 * Last updated: 2026-04-08
 */

export interface StaticFireworksPrice {
  input_per_million: number;
  output_per_million: number;
  currency: string;
}

export const STATIC_FIREWORKS_PRICING: Record<string, StaticFireworksPrice> = {
  // ─── Frontier / Large ────────────────────────────────────────────
  "accounts/fireworks/models/llama-v3p3-70b-instruct": {
    input_per_million: 0.90,
    output_per_million: 0.90,
    currency: "USD",
  },
  "accounts/fireworks/models/llama-v3p1-405b-instruct": {
    input_per_million: 3.00,
    output_per_million: 3.00,
    currency: "USD",
  },
  "accounts/fireworks/models/deepseek-v3": {
    input_per_million: 0.90,
    output_per_million: 0.90,
    currency: "USD",
  },
  "accounts/fireworks/models/deepseek-r1": {
    input_per_million: 3.00,
    output_per_million: 8.00,
    currency: "USD",
  },
  "accounts/fireworks/models/qwen2p5-72b-instruct": {
    input_per_million: 0.90,
    output_per_million: 0.90,
    currency: "USD",
  },
  "accounts/fireworks/models/mixtral-8x22b-instruct": {
    input_per_million: 0.90,
    output_per_million: 0.90,
    currency: "USD",
  },

  // ─── Small / Fast ────────────────────────────────────────────────
  "accounts/fireworks/models/llama-v3p2-3b-instruct": {
    input_per_million: 0.10,
    output_per_million: 0.10,
    currency: "USD",
  },
  "accounts/fireworks/models/mistral-small-24b-instruct-2501": {
    input_per_million: 0.10,
    output_per_million: 0.30,
    currency: "USD",
  },
  "accounts/fireworks/models/gemma2-9b-it": {
    input_per_million: 0.20,
    output_per_million: 0.20,
    currency: "USD",
  },
};
