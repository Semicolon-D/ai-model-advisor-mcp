import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getAllModels } from "./providers/registry.js";
import { handleRecommendModel } from "./tools/recommend.js";
import { handleCompareModels } from "./tools/compare.js";
import { handleListModels } from "./tools/list.js";
import { handleGetModelInfo } from "./tools/info.js";
import { handleEstimateCost } from "./tools/estimate.js";
import { handleWhatsNew } from "./tools/discover.js";
import type { UnifiedModel } from "./types.js";

// ─── Tool Definitions ───────────────────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    name: "recommend_model",
    description:
      "Recommend the best AI model for a task. Searches across 500+ models spanning LLMs, image gen, video gen, TTS, STT, 3D, and more. Returns ranked results based on task match, capabilities, quality tier, and price.",
    inputSchema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string",
          description:
            'What you need the model for. Examples: "image generation", "coding", "video generation", "transcription", "text-to-speech", "3d model", "photorealistic images"',
        },
        requirements: {
          type: "array",
          items: { type: "string" },
          description:
            'Optional specific requirements. Examples: ["fast", "photorealistic", "reasoning", "vision", "tool_use"]',
        },
        budget: {
          type: "string",
          description: 'Optional budget constraint: "free", "low", or omit for any price',
          enum: ["free", "low"],
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 10, max: 50)",
        },
      },
      required: ["task"],
    },
  },
  {
    name: "compare_models",
    description:
      "Compare AI models side-by-side in a table. Works across providers and categories — compare LLMs against each other, image generators, or even mix categories. Auto-adapts columns based on model types.",
    inputSchema: {
      type: "object" as const,
      properties: {
        model_ids: {
          type: "array",
          items: { type: "string" },
          description:
            'Model IDs to compare. Examples: ["openai/gpt-4o", "anthropic/claude-sonnet-4"] or ["fal-ai/flux-pro/v1.1", "fal-ai/stable-diffusion-v35-large"]',
        },
      },
      required: ["model_ids"],
    },
  },
  {
    name: "list_models",
    description:
      "List and filter available AI models. Filter by category (llm, text-to-image, text-to-video, text-to-speech, speech-to-text, image-to-3d, etc.), provider (openrouter, fal), capability, or max price.",
    inputSchema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description:
            "Filter by category: llm, text-to-image, image-to-image, text-to-video, image-to-video, video-to-video, text-to-speech, speech-to-text, text-to-audio, image-to-3d, vision, embedding",
        },
        provider: {
          type: "string",
          description: "Filter by provider: openrouter, fal",
          enum: ["openrouter", "fal"],
        },
        capability: {
          type: "string",
          description:
            'Filter by capability: "tool_use", "reasoning", "vision", "photorealistic", "fast", etc.',
        },
        max_price: {
          type: "number",
          description: "Maximum price per unit in USD (e.g. 0 for free models)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 25, max: 100)",
        },
      },
    },
  },
  {
    name: "get_model_info",
    description:
      "Get a comprehensive model card for any AI model. Includes description, pricing breakdown, capabilities, quality tier, context length (LLMs), tags, license, and more.",
    inputSchema: {
      type: "object" as const,
      properties: {
        model_id: {
          type: "string",
          description:
            'The full model ID (e.g. "openai/gpt-4o", "fal-ai/flux-pro/v1.1", "fal-ai/kling-video/v2.0/master")',
        },
      },
      required: ["model_id"],
    },
  },
  {
    name: "estimate_cost",
    description:
      'Estimate the cost of using an AI model. For LLMs, provide token counts. For media models, provide unit counts. Example: estimate_cost({model_id: "fal-ai/flux-pro", usage: {images: 100}})',
    inputSchema: {
      type: "object" as const,
      properties: {
        model_id: {
          type: "string",
          description: "The model to estimate cost for",
        },
        usage: {
          type: "object",
          description:
            'Usage parameters. LLMs: {input_tokens, output_tokens, requests}. Media: {units, images, seconds, requests}',
        },
      },
      required: ["model_id", "usage"],
    },
  },
  {
    name: "whats_new",
    description:
      'Discover recently added AI models. Answers "what new models dropped this week?" Filter by time window and category.',
    inputSchema: {
      type: "object" as const,
      properties: {
        since: {
          type: "string",
          description:
            'Time window: "24h", "7d" (default), "14d", "30d", "4w"',
        },
        category: {
          type: "string",
          description: "Optional category filter (e.g. text-to-image, llm, text-to-video)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 20, max: 100)",
        },
      },
    },
  },
];

// ─── Handler dispatch ───────────────────────────────────────────────────────

type ToolHandler = (models: UnifiedModel[], args: Record<string, unknown>) => any;

const HANDLER_MAP: Record<string, ToolHandler> = {
  recommend_model: handleRecommendModel,
  compare_models: handleCompareModels,
  list_models: handleListModels,
  get_model_info: handleGetModelInfo,
  estimate_cost: handleEstimateCost,
  whats_new: handleWhatsNew,
};

// ─── Server ─────────────────────────────────────────────────────────────────

export function createServer(): Server {
  const server = new Server(
    { name: "model-advisor-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = HANDLER_MAP[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const models = await getAllModels();
    return handler(models, (args ?? {}) as Record<string, unknown>);
  });

  return server;
}
