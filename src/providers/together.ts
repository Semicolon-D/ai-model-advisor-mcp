import { cached } from "../cache.js";
import type { UnifiedModel, ModelProvider, ModelCategory } from "../types.js";
import { STATIC_TOGETHER_PRICING } from "../data/together-pricing.js";

// ─── Raw Together types ─────────────────────────────────────────────────────

interface TogetherModel {
  id: string;
  object: string;
  created: number;
  type: string;
  display_name: string;
  organization?: string;
  link?: string;
  license?: string;
  context_length?: number;
  pricing?: {
    hourly?: number;
    input?: number;
    output?: number;
    base?: number;
    finetune?: number;
  };
}

// ─── Category mapping ───────────────────────────────────────────────────────

function mapCategory(type: string): ModelCategory {
  switch (type) {
    case "chat":
    case "language":
    case "code":
      return "llm";
    case "image":
      return "text-to-image";
    case "embedding":
      return "embedding";
    case "moderation":
    case "rerank":
      return "other";
    default:
      return "llm";
  }
}

// ─── Format pricing ─────────────────────────────────────────────────────────

function formatLLMPricing(inputPerMillion: number, outputPerMillion: number): string {
  if (inputPerMillion === 0 && outputPerMillion === 0) return "FREE";
  return `$${inputPerMillion.toFixed(2)}/$${outputPerMillion.toFixed(2)} per 1M tokens (in/out)`;
}

// ─── Provider ───────────────────────────────────────────────────────────────

async function fetchTogetherModels(): Promise<UnifiedModel[]> {
  const apiKey = process.env.TOGETHER_API_KEY;

  // If we have an API key, fetch live data
  if (apiKey) {
    try {
      const response = await fetch("https://api.together.xyz/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) throw new Error(`Together API error: ${response.status}`);

      const models = (await response.json()) as TogetherModel[];
      return models
        .filter((m) => m.type !== "moderation" && m.type !== "rerank")
        .map((m): UnifiedModel => {
          const inputPerM = m.pricing?.input ?? -1;
          const outputPerM = m.pricing?.output ?? -1;
          const inputPerToken = inputPerM >= 0 ? inputPerM / 1_000_000 : -1;
          const outputPerToken = outputPerM >= 0 ? outputPerM / 1_000_000 : -1;

          return {
            id: m.id,
            name: m.display_name || m.id.split("/").pop() || m.id,
            provider: "together",
            description: "",
            category: mapCategory(m.type),
            pricing: {
              unit: "token",
              unitPrice: inputPerToken,
              inputPrice: inputPerToken,
              outputPrice: outputPerToken,
              formatted:
                inputPerM >= 0
                  ? formatLLMPricing(inputPerM, outputPerM)
                  : "Pricing unavailable",
            },
            capabilities: [],
            addedDate: m.created ? new Date(m.created * 1000).toISOString() : undefined,
            contextLength: m.context_length,
            licenseType: m.license,
          };
        });
    } catch {
      // Fall through to static data
    }
  }

  // Fallback: return static pricing data as models
  return Object.entries(STATIC_TOGETHER_PRICING).map(
    ([id, price]): UnifiedModel => ({
      id,
      name: id.split("/").pop()?.replace(/-/g, " ") || id,
      provider: "together",
      description: "",
      category: "llm",
      pricing: {
        unit: "token",
        unitPrice: price.input_per_million / 1_000_000,
        inputPrice: price.input_per_million / 1_000_000,
        outputPrice: price.output_per_million / 1_000_000,
        formatted: formatLLMPricing(price.input_per_million, price.output_per_million),
      },
      capabilities: [],
    })
  );
}

export const togetherProvider: ModelProvider = {
  name: "together",
  fetchModels: () => cached("together", fetchTogetherModels),
};
