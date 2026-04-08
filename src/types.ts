// ─── Categories ──────────────────────────────────────────────────────────────

export type ModelCategory =
  | "llm"
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video"
  | "video-to-video"
  | "text-to-speech"
  | "speech-to-text"
  | "text-to-audio"
  | "image-to-3d"
  | "vision"
  | "embedding"
  | "other";

export type QualityTier = "S" | "A" | "B" | "C";

export type ProviderName = "openrouter" | "fal" | "together" | "replicate" | "fireworks";

// ─── Unified Model ──────────────────────────────────────────────────────────

export interface UnifiedPricing {
  /** The billing unit: "token", "image", "megapixel", "second", "request" */
  unit: string;
  /** Price per billing unit in USD */
  unitPrice: number;
  /** For LLMs: prompt/input cost per token */
  inputPrice?: number;
  /** For LLMs: completion/output cost per token */
  outputPrice?: number;
  /** Human-readable formatted price string */
  formatted: string;
}

export interface UnifiedModel {
  /** Provider-specific model ID (e.g. "openai/gpt-4o" or "fal-ai/flux-pro/v1.1") */
  id: string;
  /** Human-readable model name */
  name: string;
  /** Which provider this model comes from */
  provider: ProviderName;
  /** Model description — what it does, what it's good at */
  description: string;
  /** Category of the model */
  category: ModelCategory;
  /** Pricing information */
  pricing: UnifiedPricing;
  /** Free-form capability tags */
  capabilities: string[];
  /** Curated quality tier (S/A/B/C) — may be undefined for unrated models */
  qualityTier?: QualityTier;
  /** When the model was added/updated (ISO string) */
  addedDate?: string;

  // ─── LLM-specific fields ─────────────────────────────────────────
  /** Context window size in tokens */
  contextLength?: number;
  /** Maximum output/completion tokens */
  maxOutputTokens?: number;

  // ─── Media-specific fields ───────────────────────────────────────
  /** Supported output resolutions */
  maxResolution?: string;
  /** License type */
  licenseType?: string;
  /** Tags from the provider */
  tags?: string[];

  // ─── Performance & Benchmarks ────────────────────────────────────
  /** Speed metrics (mostly for LLMs) */
  speed?: {
    /** Time to first token (seconds) */
    ttft?: number;
    /** Generation throughput (tokens per second) */
    throughput?: number;
  };
  /** Intelligence benchmark scores */
  benchmarks?: {
    /** Massive Multitask Language Understanding (0-100) */
    mmlu?: number;
    /** Coding benchmarks (e.g. LiveCodeBench or Aider pass%) */
    coding?: number;
    /** Math benchmarks (e.g. MATH or GSM8k) */
    math?: number;
  };
}

// ─── Provider Interface ─────────────────────────────────────────────────────

export interface ModelProvider {
  name: ProviderName;
  fetchModels(): Promise<UnifiedModel[]>;
}
