import { cached } from "../cache.js";
import type { UnifiedModel, ModelProvider } from "../types.js";

/**
 * Hosted Pricing API provider.
 *
 * Fetches pre-aggregated pricing from our Cloudflare Worker endpoint.
 * This is the PRIMARY data source — no API keys needed on the client.
 * Falls back silently if the API is unavailable (other providers will fill in).
 */

const PRICING_API_URL =
  process.env.PRICING_API_URL ?? "https://model-advisor-pricing.i-3f4.workers.dev";

interface APIPricing {
  unit: string;
  unitPrice: number;
  inputPrice?: number;
  outputPrice?: number;
  formatted: string;
}

interface APIModel {
  id: string;
  name: string;
  provider: string;
  category: string;
  pricing: APIPricing;
}

interface APIResponse {
  models: APIModel[];
  total: number;
  updated_at: string;
}

async function fetchFromPricingAPI(): Promise<UnifiedModel[]> {
  const response = await fetch(PRICING_API_URL, {
    headers: { "User-Agent": "ai-model-advisor-mcp/2.0" },
    signal: AbortSignal.timeout(10_000), // 10s timeout
  });

  if (!response.ok) {
    throw new Error(`Pricing API error: ${response.status}`);
  }

  const data = (await response.json()) as APIResponse;

  return data.models.map((m): UnifiedModel => ({
    id: m.id,
    name: m.name,
    provider: m.provider as UnifiedModel["provider"],
    description: "",
    category: m.category as UnifiedModel["category"],
    pricing: {
      unit: m.pricing.unit,
      unitPrice: m.pricing.unitPrice,
      inputPrice: m.pricing.inputPrice,
      outputPrice: m.pricing.outputPrice,
      formatted: m.pricing.formatted,
    },
    capabilities: [],
  }));
}

export const hostedProvider: ModelProvider = {
  name: "openrouter", // Will be overridden per-model by actual provider field
  fetchModels: () => cached("hosted-api", fetchFromPricingAPI),
};

export { fetchFromPricingAPI };
