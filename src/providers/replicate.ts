import { cached } from "../cache.js";
import type { UnifiedModel, ModelProvider, ModelCategory } from "../types.js";
import { STATIC_REPLICATE_PRICING } from "../data/replicate-pricing.js";

// ─── Raw Replicate types ────────────────────────────────────────────────────

interface ReplicateModel {
  url: string;
  owner: string;
  name: string;
  description?: string;
  visibility: string;
  github_url?: string;
  paper_url?: string;
  license_url?: string;
  run_count?: number;
  cover_image_url?: string;
  default_example?: unknown;
  latest_version?: {
    id: string;
    created_at: string;
  };
}

interface ReplicateListResponse {
  results: ReplicateModel[];
  next?: string;
}

// ─── Category heuristics ────────────────────────────────────────────────────

function inferCategory(owner: string, name: string, desc: string): ModelCategory {
  const text = `${owner}/${name} ${desc}`.toLowerCase();
  if (text.includes("text-to-image") || text.includes("image generat") || text.includes("flux") || text.includes("stable-diffusion") || text.includes("sdxl") || text.includes("ideogram") || text.includes("recraft")) return "text-to-image";
  if (text.includes("image-to-video") || text.includes("i2v") || text.includes("video generat") || text.includes("text-to-video") || text.includes("wan-2") || text.includes("kling")) return "text-to-video";
  if (text.includes("text-to-speech") || text.includes("tts")) return "text-to-speech";
  if (text.includes("speech-to-text") || text.includes("whisper") || text.includes("transcri")) return "speech-to-text";
  if (text.includes("3d") || text.includes("mesh") || text.includes("point cloud")) return "image-to-3d";
  if (text.includes("image-to-image") || text.includes("upscal") || text.includes("inpaint") || text.includes("img2img")) return "image-to-image";
  if (text.includes("llm") || text.includes("language model") || text.includes("chat") || text.includes("instruct") || text.includes("llama") || text.includes("claude") || text.includes("deepseek")) return "llm";
  return "other";
}

// ─── Provider ───────────────────────────────────────────────────────────────

async function fetchReplicateModels(): Promise<UnifiedModel[]> {
  const apiKey = process.env.REPLICATE_API_TOKEN;

  if (apiKey) {
    try {
      const allModels: ReplicateModel[] = [];
      let url: string | undefined = "https://api.replicate.com/v1/models?limit=100";

      // Paginate (cap at 3 pages = 300 models to avoid slow startup)
      let pages = 0;
      while (url && pages < 3) {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) break;

        const data = (await response.json()) as ReplicateListResponse;
        allModels.push(...data.results);
        url = data.next ?? undefined;
        pages++;
      }

      const models = allModels
        .filter((m) => m.visibility === "public")
        .map((m): UnifiedModel => {
          const id = `${m.owner}/${m.name}`;
          const staticPrice = STATIC_REPLICATE_PRICING[id];

          let pricing: UnifiedModel["pricing"];
          if (staticPrice) {
            if (staticPrice.unit === "million_tokens") {
              pricing = {
                unit: "token",
                unitPrice: staticPrice.unit_price / 1_000_000,
                inputPrice: staticPrice.unit_price / 1_000_000,
                outputPrice: (staticPrice.output_price ?? staticPrice.unit_price) / 1_000_000,
                formatted: `$${staticPrice.unit_price.toFixed(2)}/$${(staticPrice.output_price ?? staticPrice.unit_price).toFixed(2)} per 1M tokens (in/out)`,
              };
            } else {
              pricing = {
                unit: staticPrice.unit,
                unitPrice: staticPrice.unit_price,
                formatted: staticPrice.unit_price === 0
                  ? "FREE"
                  : `$${staticPrice.unit_price.toFixed(4)} / ${staticPrice.unit}`,
              };
            }
          } else {
            pricing = {
              unit: "unknown",
              unitPrice: -1,
              formatted: "Pricing unavailable",
            };
          }

          return {
            id,
            name: m.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            provider: "replicate",
            description: m.description ?? "",
            category: inferCategory(m.owner, m.name, m.description ?? ""),
            pricing,
            capabilities: [],
            addedDate: m.latest_version?.created_at,
          };
        });

      return models;
    } catch {
      // Fall through to static data
    }
  }

  // Fallback: return static pricing data as models
  return Object.entries(STATIC_REPLICATE_PRICING).map(
    ([id, price]): UnifiedModel => {
      const [owner, name] = id.split("/");
      let pricing: UnifiedModel["pricing"];

      if (price.unit === "million_tokens") {
        pricing = {
          unit: "token",
          unitPrice: price.unit_price / 1_000_000,
          inputPrice: price.unit_price / 1_000_000,
          outputPrice: (price.output_price ?? price.unit_price) / 1_000_000,
          formatted: `$${price.unit_price.toFixed(2)}/$${(price.output_price ?? price.unit_price).toFixed(2)} per 1M tokens (in/out)`,
        };
      } else {
        pricing = {
          unit: price.unit,
          unitPrice: price.unit_price,
          formatted: price.unit_price === 0
            ? "FREE"
            : `$${price.unit_price.toFixed(4)} / ${price.unit}`,
        };
      }

      return {
        id,
        name: (name ?? id).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        provider: "replicate",
        description: "",
        category: inferCategory(owner ?? "", name ?? "", ""),
        pricing,
        capabilities: [],
      };
    }
  );
}

export const replicateProvider: ModelProvider = {
  name: "replicate",
  fetchModels: () => cached("replicate", fetchReplicateModels),
};
