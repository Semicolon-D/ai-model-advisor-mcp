import type { UnifiedModel, QualityTier } from "../types.js";

// ─── Curated Quality Tiers ──────────────────────────────────────────────────
// These are opinionated quality ratings for popular models, updated manually.
// S = Best in class, A = Excellent, B = Good, C = Adequate

const QUALITY_TIERS: Record<string, QualityTier> = {
  // ─── LLMs ──────────────────────────────────────────────────
  "anthropic/claude-opus-4": "S",
  "anthropic/claude-sonnet-4": "S",
  "openai/gpt-4o": "S",
  "google/gemini-2.5-pro-preview": "S",
  "anthropic/claude-haiku-3.5": "A",
  "openai/gpt-4o-mini": "A",
  "google/gemini-2.0-flash-001": "A",
  "google/gemini-2.5-flash-preview": "A",
  "deepseek/deepseek-chat": "A",
  "deepseek/deepseek-r1": "S",
  "meta-llama/llama-4-maverick": "A",
  "meta-llama/llama-4-scout": "B",
  "meta-llama/llama-3.3-70b-instruct": "A",
  "mistralai/mistral-large": "A",
  "mistralai/mistral-small-3.1-24b-instruct": "B",
  "qwen/qwen-2.5-72b-instruct": "A",
  "qwen/qwen-2.5-coder-32b-instruct": "A",

  // ─── Image Generation ──────────────────────────────────────
  "fal-ai/flux-pro/v1.1-ultra": "S",
  "fal-ai/flux-pro/v1.1": "S",
  "fal-ai/flux-pro": "A",
  "fal-ai/flux/dev": "A",
  "fal-ai/flux/schnell": "B",
  "fal-ai/flux-realism": "A",
  "fal-ai/stable-diffusion-v35-large": "A",
  "fal-ai/stable-diffusion-v35-large-turbo": "B",
  "fal-ai/recraft-v3": "A",
  "fal-ai/ideogram/v2/turbo": "A",
  "fal-ai/aura-flow": "B",

  // ─── Video Generation ──────────────────────────────────────
  "fal-ai/kling-video/v2.0/master": "S",
  "fal-ai/kling-video/v1.5/pro": "A",
  "fal-ai/minimax/video-01": "A",
  "fal-ai/wan/v2.2-a14b/text-to-video": "B",
  "fal-ai/hunyuan-video": "A",
  "fal-ai/luma-dream-machine": "A",

  // ─── Speech/Audio ──────────────────────────────────────────
  "fal-ai/wizper/large-v3": "S",
  "fal-ai/kokoro/american-english": "A",

  // ─── 3D ────────────────────────────────────────────────────
  "fal-ai/hunyuan3d-v21": "A",
  "fal-ai/trellis": "B",
};

/**
 * Applies curated quality tiers to models in-place and returns them.
 */
export function applyQualityTiers(models: UnifiedModel[]): UnifiedModel[] {
  for (const model of models) {
    const tier = QUALITY_TIERS[model.id];
    if (tier) {
      model.qualityTier = tier;
    }
  }
  return models;
}
