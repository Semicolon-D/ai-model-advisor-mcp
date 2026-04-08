import { cached } from "../cache.js";
import type { UnifiedModel, ModelProvider } from "../types.js";
import { STATIC_FIREWORKS_PRICING } from "../data/fireworks-pricing.js";

// ─── Format pricing ─────────────────────────────────────────────────────────

function formatLLMPricing(inputPerMillion: number, outputPerMillion: number): string {
  if (inputPerMillion === 0 && outputPerMillion === 0) return "FREE";
  return `$${inputPerMillion.toFixed(2)}/$${outputPerMillion.toFixed(2)} per 1M tokens (in/out)`;
}

// ─── Provider ───────────────────────────────────────────────────────────────

async function fetchFireworksModels(): Promise<UnifiedModel[]> {
  const apiKey = process.env.FIREWORKS_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.fireworks.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) throw new Error(`Fireworks API error: ${response.status}`);

      const data = await response.json();
      const models = (data.data ?? data) as Array<{
        id: string;
        object?: string;
        created?: number;
        owned_by?: string;
        context_length?: number;
        pricing?: { input?: number; output?: number };
      }>;

      return models
        .filter((m) => m.id.startsWith("accounts/"))
        .map((m): UnifiedModel => {
          const inputPerM = m.pricing?.input ?? -1;
          const outputPerM = m.pricing?.output ?? -1;
          const staticPrice = STATIC_FIREWORKS_PRICING[m.id];

          const effectiveInput = inputPerM >= 0 ? inputPerM : staticPrice?.input_per_million ?? -1;
          const effectiveOutput = outputPerM >= 0 ? outputPerM : staticPrice?.output_per_million ?? -1;

          return {
            id: m.id,
            name: m.id.split("/").pop()?.replace(/-/g, " ") || m.id,
            provider: "fireworks",
            description: "",
            category: "llm",
            pricing: {
              unit: "token",
              unitPrice: effectiveInput >= 0 ? effectiveInput / 1_000_000 : -1,
              inputPrice: effectiveInput >= 0 ? effectiveInput / 1_000_000 : undefined,
              outputPrice: effectiveOutput >= 0 ? effectiveOutput / 1_000_000 : undefined,
              formatted:
                effectiveInput >= 0
                  ? formatLLMPricing(effectiveInput, effectiveOutput)
                  : "Pricing unavailable",
            },
            capabilities: [],
            addedDate: m.created ? new Date(m.created * 1000).toISOString() : undefined,
            contextLength: m.context_length,
          };
        });
    } catch {
      // Fall through to static data
    }
  }

  // Fallback: return static pricing data as models
  return Object.entries(STATIC_FIREWORKS_PRICING).map(
    ([id, price]): UnifiedModel => ({
      id,
      name: id.split("/").pop()?.replace(/-/g, " ") || id,
      provider: "fireworks",
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

export const fireworksProvider: ModelProvider = {
  name: "fireworks",
  fetchModels: () => cached("fireworks", fetchFireworksModels),
};
