import type { ModelProvider } from "../types.js";
import { openrouterProvider } from "./openrouter.js";
import { falProvider } from "./fal.js";
import { togetherProvider } from "./together.js";
import { replicateProvider } from "./replicate.js";
import { fireworksProvider } from "./fireworks.js";
import { fetchFromPricingAPI } from "./hosted.js";
import { applyQualityTiers } from "../data/quality.js";
import { cached } from "../cache.js";
import type { UnifiedModel } from "../types.js";

/**
 * Direct providers — used as fallback when the hosted API is unavailable,
 * and to supplement with any models the hosted API doesn't cover.
 */
const directProviders: ModelProvider[] = [
  openrouterProvider,
  falProvider,
  togetherProvider,
  replicateProvider,
  fireworksProvider,
];

/**
 * Fetch all models using a tiered strategy:
 *
 * 1. Try the hosted pricing API first (fast, no keys needed, covers all providers)
 * 2. Supplement with direct provider calls for richer data (capabilities, context, etc.)
 * 3. Deduplicate by model ID (direct provider data wins for richer fields)
 */
async function fetchAllModels(): Promise<UnifiedModel[]> {
  // Kick off hosted API + all direct providers concurrently
  const [hostedResult, ...directResults] = await Promise.allSettled([
    fetchFromPricingAPI().catch(() => [] as UnifiedModel[]),
    ...directProviders.map((p) => p.fetchModels().catch(() => [] as UnifiedModel[])),
  ]);

  const hostedModels =
    hostedResult.status === "fulfilled" ? hostedResult.value : [];

  const directModels: UnifiedModel[] = [];
  for (const result of directResults) {
    if (result.status === "fulfilled") {
      directModels.push(...result.value);
    }
  }

  // Merge: direct provider data takes priority (richer fields),
  // but hosted API fills in any models not covered by direct providers
  const modelMap = new Map<string, UnifiedModel>();

  // Seed with hosted data first
  for (const m of hostedModels) {
    modelMap.set(m.id, m);
  }

  // Override with direct provider data (has capabilities, context length, etc.)
  for (const m of directModels) {
    const existing = modelMap.get(m.id);
    if (existing) {
      // Merge: keep the richer direct data but fill in pricing from hosted if needed
      modelMap.set(m.id, {
        ...m,
        pricing: m.pricing.unitPrice >= 0 ? m.pricing : existing.pricing,
      });
    } else {
      modelMap.set(m.id, m);
    }
  }

  return applyQualityTiers([...modelMap.values()]);
}

export async function getAllModels(): Promise<UnifiedModel[]> {
  return cached("all-models", fetchAllModels);
}
