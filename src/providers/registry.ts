import type { UnifiedModel, ModelProvider } from "../types.js";
import { openrouterProvider } from "./openrouter.js";
import { falProvider } from "./fal.js";
import { applyQualityTiers } from "../data/quality.js";

const providers: ModelProvider[] = [openrouterProvider, falProvider];

/**
 * Fetches all models from all providers, merges, and applies quality tiers.
 * Provider failures are logged but don't break the entire fetch.
 */
export async function getAllModels(): Promise<UnifiedModel[]> {
  const results = await Promise.allSettled(
    providers.map((p) => p.fetchModels())
  );

  const models: UnifiedModel[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      models.push(...result.value);
    } else {
      console.error(
        `[model-advisor] Failed to fetch from ${providers[i].name}: ${result.reason}`
      );
    }
  }

  return applyQualityTiers(models);
}
