/**
 * Static fallback pricing for popular Replicate models.
 * Sourced from replicate.com/pricing — no API key needed for these.
 * Mixed billing: per-image, per-token, per-second depending on model.
 *
 * Last updated: 2026-04-08
 */

export interface StaticReplicatePrice {
  unit_price: number;
  unit: string;
  currency: string;
  /** For LLMs: output token price. unit_price is input price. */
  output_price?: number;
}

export const STATIC_REPLICATE_PRICING: Record<string, StaticReplicatePrice> = {
  // ─── Image Generation ────────────────────────────────────────────
  "black-forest-labs/flux-1.1-pro": {
    unit_price: 0.04,
    unit: "image",
    currency: "USD",
  },
  "black-forest-labs/flux-dev": {
    unit_price: 0.025,
    unit: "image",
    currency: "USD",
  },
  "black-forest-labs/flux-schnell": {
    unit_price: 0.003,
    unit: "image",
    currency: "USD",
  },
  "ideogram-ai/ideogram-v3-quality": {
    unit_price: 0.09,
    unit: "image",
    currency: "USD",
  },
  "recraft-ai/recraft-v3": {
    unit_price: 0.04,
    unit: "image",
    currency: "USD",
  },
  "stability-ai/stable-diffusion-3.5-large": {
    unit_price: 0.065,
    unit: "image",
    currency: "USD",
  },

  // ─── Video Generation ────────────────────────────────────────────
  "wavespeedai/wan-2.1-i2v-720p": {
    unit_price: 0.25,
    unit: "second",
    currency: "USD",
  },
  "wavespeedai/wan-2.1-i2v-480p": {
    unit_price: 0.09,
    unit: "second",
    currency: "USD",
  },

  // ─── LLMs ────────────────────────────────────────────────────────
  "anthropic/claude-3.7-sonnet": {
    unit_price: 3.00, // per 1M input tokens
    unit: "million_tokens",
    currency: "USD",
    output_price: 15.00, // per 1M output tokens
  },
  "deepseek-ai/deepseek-r1": {
    unit_price: 3.75, // per 1M input tokens
    unit: "million_tokens",
    currency: "USD",
    output_price: 10.00,
  },
  "meta/meta-llama-3-70b-instruct": {
    unit_price: 0.65,
    unit: "million_tokens",
    currency: "USD",
    output_price: 2.75,
  },
};
