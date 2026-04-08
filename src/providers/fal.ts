import { cached } from "../cache.js";
import type { UnifiedModel, ModelProvider, ModelCategory } from "../types.js";
import { STATIC_FAL_PRICING, type StaticFalPrice } from "../data/fal-pricing.js";

// ─── Raw fal types ──────────────────────────────────────────────────────────

interface FalModel {
  endpoint_id: string;
  metadata: {
    display_name: string;
    category: string;
    description: string;
    status: string;
    tags: string[];
    updated_at: string;
    date?: string;
    license_type?: string;
    thumbnail_url?: string;
    group?: { key: string; label: string };
  };
}

interface FalPriceEntry {
  endpoint_id: string;
  unit_price: number;
  unit: string;
  currency: string;
}

// ─── Category mapping ───────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, ModelCategory> = {
  "text-to-image": "text-to-image",
  "image-to-image": "image-to-image",
  "text-to-video": "text-to-video",
  "image-to-video": "image-to-video",
  "video-to-video": "video-to-video",
  "text-to-speech": "text-to-speech",
  "speech-to-text": "speech-to-text",
  "text-to-audio": "text-to-audio",
  "image-to-3d": "image-to-3d",
  "vision": "vision",
  "llm": "llm",
  "training": "other",
};

function mapCategory(falCategory: string): ModelCategory {
  return CATEGORY_MAP[falCategory] ?? "other";
}

// ─── Fetch models (no auth required) ────────────────────────────────────────

async function fetchAllFalModels(): Promise<FalModel[]> {
  const allModels: FalModel[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const url = new URL("https://api.fal.ai/v1/models");
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);

    let retries = 3;
    while (retries > 0) {
      const response = await fetch(url.toString());
      if (response.status === 429) {
        retries--;
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      if (!response.ok) {
        throw new Error(`fal.ai API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models = data.models as FalModel[];
      allModels.push(...models.filter((m) => m.metadata.status === "active"));
      cursor = data.next_cursor ?? null;
      hasMore = data.has_more === true && cursor !== null;
      break;
    }
    
    if (retries === 0) {
      // If we exhausted retries due to 429, just return what we have so far
      break;
    }
  }

  return allModels;
}

// ─── Fetch pricing (live API with static fallback) ──────────────────────────

async function fetchFalPricing(endpointIds: string[]): Promise<Map<string, FalPriceEntry>> {
  const priceMap = new Map<string, FalPriceEntry>();

  // 1. Seed with static fallback pricing (always available, no key needed)
  for (const id of endpointIds) {
    const staticPrice = STATIC_FAL_PRICING[id];
    if (staticPrice) {
      priceMap.set(id, {
        endpoint_id: id,
        unit_price: staticPrice.unit_price,
        unit: staticPrice.unit,
        currency: staticPrice.currency,
      });
    }
  }

  // 2. If FAL_KEY is available, override with live API data (more up-to-date)
  const falKey = process.env.FAL_KEY;
  if (falKey) {
    for (let i = 0; i < endpointIds.length; i += 50) {
      const batch = endpointIds.slice(i, i + 50);
      const url = new URL("https://api.fal.ai/v1/models/pricing");
      for (const id of batch) {
        url.searchParams.append("endpoint_id", id);
      }

      try {
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Key ${falKey}` },
        });
        if (!response.ok) continue;

        const data = await response.json();
        for (const entry of (data.prices ?? []) as FalPriceEntry[]) {
          priceMap.set(entry.endpoint_id, entry);
        }
      } catch {
        // Live API failed — static fallback is already in the map
      }
    }
  }

  return priceMap;
}

// ─── Price formatting ───────────────────────────────────────────────────────

function formatFalPrice(price: FalPriceEntry | undefined): string {
  if (!price) return "Pricing unavailable";
  if (price.unit_price === 0) return "FREE";
  return `$${price.unit_price.toFixed(4)} / ${price.unit}`;
}

// ─── Derive capabilities from category + tags ──────────────────────────────

function deriveCapabilities(m: FalModel): string[] {
  const caps: string[] = [];
  const tags = m.metadata.tags ?? [];
  const cat = m.metadata.category;

  // From tags
  if (tags.includes("realism")) caps.push("photorealistic");
  if (tags.includes("typography")) caps.push("typography");
  if (tags.includes("fast")) caps.push("fast");
  if (tags.includes("hd")) caps.push("high_resolution");
  if (tags.includes("inpaint")) caps.push("inpainting");
  if (tags.includes("controlnet")) caps.push("controlnet");

  // From category
  if (cat === "text-to-image" || cat === "image-to-image") caps.push("image_generation");
  if (cat === "text-to-video" || cat === "image-to-video" || cat === "video-to-video") caps.push("video_generation");
  if (cat === "text-to-speech") caps.push("tts");
  if (cat === "speech-to-text") caps.push("stt");
  if (cat === "text-to-audio") caps.push("audio_generation");
  if (cat === "image-to-3d") caps.push("3d_generation");

  return caps;
}

// ─── Provider ───────────────────────────────────────────────────────────────

async function fetchFalModels(): Promise<UnifiedModel[]> {
  const models = await fetchAllFalModels();
  const endpointIds = models.map((m) => m.endpoint_id);
  const priceMap = await fetchFalPricing(endpointIds);

  return models.map((m): UnifiedModel => {
    const price = priceMap.get(m.endpoint_id);
    return {
      id: m.endpoint_id,
      name: m.metadata.display_name,
      provider: "fal",
      description: m.metadata.description ?? "",
      category: mapCategory(m.metadata.category),
      pricing: {
        unit: price?.unit ?? "unknown",
        unitPrice: price?.unit_price ?? -1,
        formatted: formatFalPrice(price),
      },
      capabilities: deriveCapabilities(m),
      addedDate: m.metadata.date ?? m.metadata.updated_at,
      tags: m.metadata.tags,
      licenseType: m.metadata.license_type,
    };
  });
}

export const falProvider: ModelProvider = {
  name: "fal",
  fetchModels: () => cached("fal", fetchFalModels),
};
