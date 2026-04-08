/**
 * Static fallback pricing for popular fal models.
 * Sourced from public fal.ai model pages — no API key needed.
 * These are used when FAL_KEY is not set, so the server still returns
 * real pricing instead of "Pricing requires FAL_KEY".
 *
 * Last updated: 2026-04-08
 */

export interface StaticFalPrice {
  unit_price: number;
  unit: string;
  currency: string;
}

export const STATIC_FAL_PRICING: Record<string, StaticFalPrice> = {
  // ─── Image Generation ────────────────────────────────────────────
  "fal-ai/flux-pro/v1.1": {
    unit_price: 0.04,
    unit: "megapixel",
    currency: "USD",
  },
  "fal-ai/flux-pro/v1.1-ultra": {
    unit_price: 0.06,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/flux-pro": {
    unit_price: 0.05,
    unit: "megapixel",
    currency: "USD",
  },
  "fal-ai/flux-pro/kontext": {
    unit_price: 0.05,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/flux-pro/kontext/text-to-image": {
    unit_price: 0.05,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/flux/dev": {
    unit_price: 0.025,
    unit: "megapixel",
    currency: "USD",
  },
  "fal-ai/flux/schnell": {
    unit_price: 0.003,
    unit: "megapixel",
    currency: "USD",
  },
  "fal-ai/stable-diffusion-v35-large": {
    unit_price: 0.065,
    unit: "megapixel",
    currency: "USD",
  },
  "fal-ai/stable-diffusion-v35-large-turbo": {
    unit_price: 0.02,
    unit: "megapixel",
    currency: "USD",
  },
  "fal-ai/ideogram/v2/turbo": {
    unit_price: 0.05,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/recraft-v3": {
    unit_price: 0.04,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/aura-flow": {
    unit_price: 0.012,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/nano-banana-2": {
    unit_price: 0.08,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/nano-banana-pro": {
    unit_price: 0.15,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/nano-banana-pro/edit": {
    unit_price: 0.15,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/nano-banana-2/edit": {
    unit_price: 0.08,
    unit: "image",
    currency: "USD",
  },
  "fal-ai/flux-realism": {
    unit_price: 0.025,
    unit: "megapixel",
    currency: "USD",
  },

  // ─── Video Generation ────────────────────────────────────────────
  "fal-ai/kling-video/v2.0/master": {
    unit_price: 0.065,
    unit: "second",
    currency: "USD",
  },
  "fal-ai/kling-video/v1.5/pro": {
    unit_price: 0.05,
    unit: "second",
    currency: "USD",
  },
  "fal-ai/minimax/video-01": {
    unit_price: 0.50,
    unit: "video",
    currency: "USD",
  },
  "fal-ai/hunyuan-video": {
    unit_price: 0.40,
    unit: "video",
    currency: "USD",
  },
  "fal-ai/luma-dream-machine": {
    unit_price: 0.032,
    unit: "second",
    currency: "USD",
  },
  "fal-ai/wan/v2.2-a14b/text-to-video": {
    unit_price: 0.25,
    unit: "video",
    currency: "USD",
  },

  // ─── Speech / Audio ──────────────────────────────────────────────
  "fal-ai/kokoro/american-english": {
    unit_price: 0.0001,
    unit: "character",
    currency: "USD",
  },

  // ─── 3D ──────────────────────────────────────────────────────────
  "fal-ai/hunyuan3d-v21": {
    unit_price: 0.10,
    unit: "request",
    currency: "USD",
  },
  "fal-ai/trellis": {
    unit_price: 0.08,
    unit: "request",
    currency: "USD",
  },
};
