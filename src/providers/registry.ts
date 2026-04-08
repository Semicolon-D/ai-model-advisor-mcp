import { fetchFromPricingAPI } from "./hosted.js";
import { applyQualityTiers } from "../data/quality.js";
import { cached } from "../cache.js";
import type { UnifiedModel } from "../types.js";

/**
 * Fetch all models from the centralized Cloudflare Worker pricing API.
 * This API acts as the single source of truth, already aggregating
 * multiple providers and enriching them with performance benchmarks.
 */
async function fetchAllModels(): Promise<UnifiedModel[]> {
  try {
    const hostedModels = await fetchFromPricingAPI();
    return applyQualityTiers(hostedModels);
  } catch (error) {
    console.error("Failed to fetch models from centralized API:", error);
    return [];
  }
}

export async function getAllModels(): Promise<UnifiedModel[]> {
  return cached("all-models", fetchAllModels);
}
