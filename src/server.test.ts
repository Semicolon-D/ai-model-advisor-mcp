import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleRecommendModel } from "./tools/recommend.js";
import { handleCompareModels } from "./tools/compare.js";
import { handleListModels } from "./tools/list.js";
import { handleGetModelInfo } from "./tools/info.js";
import { handleEstimateCost } from "./tools/estimate.js";
import { handleWhatsNew } from "./tools/discover.js";
import { handleFindCheapestProvider } from "./tools/shop.js";
import { handleBatchGetPricing } from "./tools/batch.js";
import { TOOL_DEFINITIONS } from "./server.js";
import type { UnifiedModel } from "./types.js";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const MOCK_MODELS: UnifiedModel[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openrouter",
    description: "OpenAI's versatile flagship model with vision and tool use.",
    category: "llm",
    pricing: { unit: "token", unitPrice: 0.0000025, inputPrice: 0.0000025, outputPrice: 0.00001, formatted: "$2.50/$10.00 per 1M tokens (in/out)" },
    capabilities: ["tool_use", "vision", "structured_output"],
    qualityTier: "S",
    contextLength: 128000,
    maxOutputTokens: 16384,
    addedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "openrouter",
    description: "Claude Sonnet 4 excels in coding and reasoning.",
    category: "llm",
    pricing: { unit: "token", unitPrice: 0.000003, inputPrice: 0.000003, outputPrice: 0.000015, formatted: "$3.00/$15.00 per 1M tokens (in/out)" },
    capabilities: ["tool_use", "reasoning", "vision"],
    qualityTier: "S",
    contextLength: 200000,
    maxOutputTokens: 64000,
    addedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    name: "Flux Pro v1.1",
    provider: "fal",
    description: "State-of-the-art text-to-image model with photorealistic output.",
    category: "text-to-image",
    pricing: { unit: "image", unitPrice: 0.05, formatted: "$0.0500 / image" },
    capabilities: ["image_generation", "photorealistic"],
    qualityTier: "S",
    tags: ["realism", "typography"],
    addedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fal-ai/kling-video/v2.0/master",
    name: "Kling Video v2.0 Master",
    provider: "fal",
    description: "Professional quality AI video generation.",
    category: "text-to-video",
    pricing: { unit: "second", unitPrice: 0.10, formatted: "$0.1000 / second" },
    capabilities: ["video_generation"],
    qualityTier: "S",
    addedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fal-ai/wizper/large-v3",
    name: "Wizper Large v3",
    provider: "fal",
    description: "Speech-to-text transcription model.",
    category: "speech-to-text",
    pricing: { unit: "request", unitPrice: 0.005, formatted: "$0.0050 / request" },
    capabilities: ["stt"],
    qualityTier: "S",
    addedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "openrouter",
    description: "Meta's open-source large language model.",
    category: "llm",
    pricing: { unit: "token", unitPrice: 0, inputPrice: 0, outputPrice: 0, formatted: "FREE" },
    capabilities: ["tool_use"],
    qualityTier: "A",
    contextLength: 131072,
    addedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // ─── New: multi-provider models for cross-provider testing ──────
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    name: "Llama 3.3 70B Instruct Turbo",
    provider: "together",
    description: "Meta's Llama 3.3 on Together AI.",
    category: "llm",
    pricing: { unit: "token", unitPrice: 0.00000088, inputPrice: 0.00000088, outputPrice: 0.00000088, formatted: "$0.88/$0.88 per 1M tokens (in/out)" },
    capabilities: [],
  },
  {
    id: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    name: "llama v3p3 70b instruct",
    provider: "fireworks",
    description: "Meta's Llama 3.3 on Fireworks.",
    category: "llm",
    pricing: { unit: "token", unitPrice: 0.0000009, inputPrice: 0.0000009, outputPrice: 0.0000009, formatted: "$0.90/$0.90 per 1M tokens (in/out)" },
    capabilities: [],
  },
  {
    id: "black-forest-labs/flux-1.1-pro",
    name: "Flux 1.1 Pro",
    provider: "replicate",
    description: "FLUX Pro on Replicate.",
    category: "text-to-image",
    pricing: { unit: "image", unitPrice: 0.04, formatted: "$0.0400 / image" },
    capabilities: ["image_generation"],
  },
];

// ─── recommend_model ────────────────────────────────────────────────────────

describe("handleRecommendModel", () => {
  it("recommends LLMs for coding tasks", () => {
    const result = handleRecommendModel(MOCK_MODELS, { task: "coding" });
    const text = result.content[0].text;
    assert.ok(text.includes("GPT-4o") || text.includes("Claude"));
    assert.ok(!text.includes("Flux")); // should not include image models
  });

  it("recommends image models for image generation", () => {
    const result = handleRecommendModel(MOCK_MODELS, { task: "image generation" });
    const text = result.content[0].text;
    assert.ok(text.includes("Flux"));
    assert.ok(!text.includes("GPT-4o"));
  });

  it("recommends video models for video tasks", () => {
    const result = handleRecommendModel(MOCK_MODELS, { task: "video" });
    const text = result.content[0].text;
    assert.ok(text.includes("Kling"));
  });

  it("recommends transcription models for stt", () => {
    const result = handleRecommendModel(MOCK_MODELS, { task: "transcription" });
    const text = result.content[0].text;
    assert.ok(text.includes("Wizper"));
  });

  it("filters by free budget", () => {
    const result = handleRecommendModel(MOCK_MODELS, { task: "llm", budget: "free" });
    const text = result.content[0].text;
    assert.ok(text.includes("Llama"));
    assert.ok(!text.includes("GPT-4o")); // paid model
  });

  it("returns error for missing task", () => {
    const result = handleRecommendModel(MOCK_MODELS, {});
    assert.equal(result.isError, true);
  });
});

// ─── compare_models ─────────────────────────────────────────────────────────

describe("handleCompareModels", () => {
  it("compares LLMs with capability columns", () => {
    const result = handleCompareModels(MOCK_MODELS, {
      model_ids: ["openai/gpt-4o", "anthropic/claude-sonnet-4"],
    });
    const text = result.content[0].text;
    assert.ok(text.includes("|")); // table
    assert.ok(text.includes("Tools"));
    assert.ok(text.includes("Reason"));
    assert.ok(text.includes("Speed"));
    assert.ok(text.includes("MMLU"));
    assert.ok(text.includes("✅"));
  });

  it("compares media models with category columns", () => {
    const result = handleCompareModels(MOCK_MODELS, {
      model_ids: ["fal-ai/flux-pro/v1.1", "fal-ai/kling-video/v2.0/master"],
    });
    const text = result.content[0].text;
    assert.ok(text.includes("|"));
    assert.ok(text.includes("Category"));
  });

  it("handles not-found models gracefully", () => {
    const result = handleCompareModels(MOCK_MODELS, {
      model_ids: ["nonexistent/model"],
    });
    assert.equal(result.isError, true);
  });
});

// ─── list_models ────────────────────────────────────────────────────────────

describe("handleListModels", () => {
  it("filters by category", () => {
    const result = handleListModels(MOCK_MODELS, { category: "text-to-image" });
    const text = result.content[0].text;
    assert.ok(text.includes("fal-ai/flux-pro"));
    assert.ok(!text.includes("openai/gpt"));
  });

  it("filters by provider", () => {
    const result = handleListModels(MOCK_MODELS, { provider: "fal" });
    const text = result.content[0].text;
    assert.ok(text.includes("fal-ai"));
    assert.ok(!text.includes("openai"));
  });

  it("filters by max_price=0 for free models", () => {
    const result = handleListModels(MOCK_MODELS, { max_price: 0 });
    const text = result.content[0].text;
    assert.ok(text.includes("Llama") || text.includes("FREE"));
  });
});

// ─── get_model_info ─────────────────────────────────────────────────────────

describe("handleGetModelInfo", () => {
  it("returns full model card for an LLM", () => {
    const result = handleGetModelInfo(MOCK_MODELS, { model_id: "openai/gpt-4o" });
    const text = result.content[0].text;
    assert.ok(text.includes("GPT-4o"));
    assert.ok(text.includes("Description"));
    assert.ok(text.includes("Pricing"));
    assert.ok(text.includes("128,000"));
    assert.ok(text.includes("tool use"));
  });

  it("returns full model card for a fal model", () => {
    const result = handleGetModelInfo(MOCK_MODELS, { model_id: "fal-ai/flux-pro/v1.1" });
    const text = result.content[0].text;
    assert.ok(text.includes("Flux Pro"));
    assert.ok(text.includes("$0.0500 / image"));
    assert.ok(text.includes("photorealistic"));
  });

  it("suggests similar models for typos", () => {
    const result = handleGetModelInfo(MOCK_MODELS, { model_id: "flux" });
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes("Did you mean"));
  });
});

// ─── estimate_cost ──────────────────────────────────────────────────────────

describe("handleEstimateCost", () => {
  it("estimates LLM cost by tokens", () => {
    const result = handleEstimateCost(MOCK_MODELS, {
      model_id: "openai/gpt-4o",
      usage: { input_tokens: 1000000, output_tokens: 100000 },
    });
    const text = result.content[0].text;
    assert.ok(text.includes("Total Estimated Cost"));
    assert.ok(text.includes("$"));
  });

  it("estimates media cost by units", () => {
    const result = handleEstimateCost(MOCK_MODELS, {
      model_id: "fal-ai/flux-pro/v1.1",
      usage: { images: 100 },
    });
    const text = result.content[0].text;
    assert.ok(text.includes("$5.0000")); // 100 * $0.05
  });
});

// ─── whats_new ──────────────────────────────────────────────────────────────

describe("handleWhatsNew", () => {
  it("finds models added in last 7 days", () => {
    const result = handleWhatsNew(MOCK_MODELS, { since: "7d" });
    const text = result.content[0].text;
    // GPT-4o (2d ago), Flux (3d ago), Claude (5d ago), Kling (1d ago) should match
    assert.ok(text.includes("Kling")); // 1d ago
    assert.ok(text.includes("GPT-4o")); // 2d ago
    assert.ok(!text.includes("Wizper")); // 30d ago
  });

  it("filters by category", () => {
    const result = handleWhatsNew(MOCK_MODELS, { since: "7d", category: "text-to-image" });
    const text = result.content[0].text;
    assert.ok(text.includes("Flux"));
    assert.ok(!text.includes("GPT-4o"));
  });

  it("rejects invalid since format", () => {
    const result = handleWhatsNew(MOCK_MODELS, { since: "yesterday" });
    assert.equal(result.isError, true);
  });
});

// ─── find_cheapest_provider ─────────────────────────────────────────────────

describe("handleFindCheapestProvider", () => {
  it("finds the same model across multiple providers", () => {
    const result = handleFindCheapestProvider(MOCK_MODELS, { model: "llama 3.3 70b" });
    const text = result.content[0].text;
    // Should find openrouter, together, and fireworks entries
    assert.ok(text.includes("openrouter"));
    assert.ok(text.includes("together"));
    assert.ok(text.includes("fireworks"));
    assert.ok(text.includes("Cheapest"));
  });

  it("finds media models across providers", () => {
    const result = handleFindCheapestProvider(MOCK_MODELS, { model: "flux pro" });
    const text = result.content[0].text;
    // Should find fal and replicate entries
    assert.ok(text.includes("fal") || text.includes("replicate"));
  });

  it("returns error for missing model param", () => {
    const result = handleFindCheapestProvider(MOCK_MODELS, {});
    assert.equal(result.isError, true);
  });

  it("handles no matches gracefully", () => {
    const result = handleFindCheapestProvider(MOCK_MODELS, { model: "nonexistent-xyz-model-9999" });
    const text = result.content[0].text;
    assert.ok(text.includes("No models matching"));
  });
});

// ─── batch_get_pricing ──────────────────────────────────────────────────────

describe("handleBatchGetPricing", () => {
  it("returns pricing for multiple models", () => {
    const result = handleBatchGetPricing(MOCK_MODELS, {
      model_ids: ["openai/gpt-4o", "fal-ai/flux-pro/v1.1"],
    });
    const text = result.content[0].text;
    assert.ok(text.includes("GPT-4o"));
    assert.ok(text.includes("Flux Pro"));
    assert.ok(text.includes("Batch Pricing"));
  });

  it("shows not-found models", () => {
    const result = handleBatchGetPricing(MOCK_MODELS, {
      model_ids: ["openai/gpt-4o", "nonexistent/model"],
    });
    const text = result.content[0].text;
    assert.ok(text.includes("Not Found"));
    assert.ok(text.includes("nonexistent/model"));
  });

  it("returns error for missing model_ids", () => {
    const result = handleBatchGetPricing(MOCK_MODELS, {});
    assert.equal(result.isError, true);
  });
});

// ─── TOOL_DEFINITIONS ───────────────────────────────────────────────────────

describe("TOOL_DEFINITIONS", () => {
  it("exports exactly 8 tools", () => {
    assert.equal(TOOL_DEFINITIONS.length, 8);
  });

  it("all tools have name, description, and inputSchema", () => {
    for (const tool of TOOL_DEFINITIONS) {
      assert.ok(tool.name);
      assert.ok(tool.description);
      assert.ok(tool.inputSchema);
    }
  });

  it("tool names match expected set", () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    assert.deepEqual(names, [
      "recommend_model",
      "compare_models",
      "list_models",
      "get_model_info",
      "estimate_cost",
      "whats_new",
      "find_cheapest_provider",
      "batch_get_pricing",
    ]);
  });
});
