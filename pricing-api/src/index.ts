/**
 * Model Advisor Pricing API — Cloudflare Worker
 *
 * Fetches pricing from all providers every 6 hours via cron,
 * stores in KV, and serves via a simple GET endpoint.
 *
 * GET /                → all pricing data (JSON)
 * GET /providers       → list of providers with status
 * GET /health          → health check
 * Cron (every 6h)      → refresh all pricing data
 */

export interface Env {
  PRICING_KV: KVNamespace;
  FAL_KEY?: string;
  TOGETHER_API_KEY?: string;
  REPLICATE_API_TOKEN?: string;
  FIREWORKS_API_KEY?: string;
  ARTIFICIAL_ANALYSIS_API_KEY?: string;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ModelPricing {
  id: string;
  name: string;
  provider: string;
  category: string;
  pricing: {
    unit: string;
    unitPrice: number;
    inputPrice?: number;
    outputPrice?: number;
    formatted: string;
  };
  speed?: {
    ttft?: number;
    throughput?: number;
  };
  benchmarks?: {
    mmlu?: number;
    coding?: number;
    math?: number;
  };
}

interface PricingSnapshot {
  models: ModelPricing[];
  updated_at: string;
  providers: Record<string, { count: number; status: string }>;
}

// ─── Provider Fetchers ──────────────────────────────────────────────────────

async function fetchOpenRouter(): Promise<ModelPricing[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter: ${res.status}`);
  const data: any = await res.json();

  return (data.data as any[]).map((m) => {
    const promptCost = parseFloat(m.pricing.prompt) * 1_000_000;
    const completionCost = parseFloat(m.pricing.completion) * 1_000_000;

    return {
      id: m.id,
      name: m.name,
      provider: "openrouter",
      category: "llm",
      pricing: {
        unit: "token",
        unitPrice: parseFloat(m.pricing.prompt),
        inputPrice: parseFloat(m.pricing.prompt),
        outputPrice: parseFloat(m.pricing.completion),
        formatted:
          promptCost === 0 && completionCost === 0
            ? "FREE"
            : `$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per 1M tokens (in/out)`,
      },
    };
  });
}

async function fetchFal(apiKey: string): Promise<ModelPricing[]> {
  // Step 1: Get model list (public, no auth)
  const listRes = await fetch("https://fal.ai/api/models?size=200");
  if (!listRes.ok) throw new Error(`fal list: ${listRes.status}`);
  const listData: any = await listRes.json();
  const models = listData.items ?? [];

  // Step 2: Get pricing (requires key)
  const ids = models.map((m: any) => m.endpoint_id ?? m.id).filter(Boolean);
  const pricingMap = new Map<string, any>();

  // Batch in groups of 50
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const params = batch.map((id: string) => `endpoint_id=${encodeURIComponent(id)}`).join("&");

    try {
      const priceRes = await fetch(`https://fal.ai/api/v1/models/pricing?${params}`, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      if (priceRes.ok) {
        const priceData: any = await priceRes.json();
        for (const p of priceData.pricing ?? []) {
          pricingMap.set(p.endpoint_id, p);
        }
      }
    } catch {
      // Skip batch on error
    }
  }

  return models.map((m: any): ModelPricing => {
    const id = m.endpoint_id ?? m.id;
    const price = pricingMap.get(id);
    const unitPrice = price?.price ?? -1;
    const unit = price?.unit ?? "unknown";

    return {
      id: `fal-ai/${id}`,
      name: m.title ?? m.name ?? id,
      provider: "fal",
      category: inferFalCategory(m),
      pricing: {
        unit,
        unitPrice,
        formatted: unitPrice >= 0 ? `$${unitPrice.toFixed(4)} / ${unit}` : "Pricing unavailable",
      },
    };
  });
}

function inferFalCategory(m: any): string {
  const text = `${m.title ?? ""} ${m.category ?? ""} ${m.tags?.join(" ") ?? ""}`.toLowerCase();
  if (text.includes("video") || text.includes("i2v") || text.includes("t2v")) return "text-to-video";
  if (text.includes("image") || text.includes("flux") || text.includes("stable-diffusion") || text.includes("sdxl")) return "text-to-image";
  if (text.includes("speech") || text.includes("tts") || text.includes("kokoro")) return "text-to-speech";
  if (text.includes("whisper") || text.includes("wizper") || text.includes("stt")) return "speech-to-text";
  if (text.includes("3d") || text.includes("mesh")) return "image-to-3d";
  if (text.includes("llm") || text.includes("chat")) return "llm";
  return "other";
}

async function fetchTogether(apiKey: string): Promise<ModelPricing[]> {
  const res = await fetch("https://api.together.xyz/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Together: ${res.status}`);
  const models = (await res.json()) as any[];

  return models
    .filter((m) => m.type !== "moderation" && m.type !== "rerank")
    .map((m): ModelPricing => {
      const inputPerM = m.pricing?.input ?? -1;
      const outputPerM = m.pricing?.output ?? -1;

      return {
        id: m.id,
        name: m.display_name || m.id.split("/").pop() || m.id,
        provider: "together",
        category: m.type === "image" ? "text-to-image" : "llm",
        pricing: {
          unit: "token",
          unitPrice: inputPerM >= 0 ? inputPerM / 1_000_000 : -1,
          inputPrice: inputPerM >= 0 ? inputPerM / 1_000_000 : undefined,
          outputPrice: outputPerM >= 0 ? outputPerM / 1_000_000 : undefined,
          formatted:
            inputPerM >= 0
              ? `$${inputPerM.toFixed(2)}/$${outputPerM.toFixed(2)} per 1M tokens (in/out)`
              : "Pricing unavailable",
        },
      };
    });
}

async function fetchReplicate(apiKey: string): Promise<ModelPricing[]> {
  const models: any[] = [];
  let url: string | undefined = "https://api.replicate.com/v1/models?limit=100";
  let pages = 0;

  while (url && pages < 5) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) break;
    const data: any = await res.json();
    models.push(...(data.results ?? []));
    url = data.next ?? undefined;
    pages++;
  }

  return models
    .filter((m) => m.visibility === "public")
    .map((m): ModelPricing => {
      const id = `${m.owner}/${m.name}`;
      return {
        id,
        name: m.name?.replace(/-/g, " ") || id,
        provider: "replicate",
        category: inferReplicateCategory(m),
        pricing: {
          unit: "unknown",
          unitPrice: -1,
          formatted: "See replicate.com/pricing",
        },
      };
    });
}

function inferReplicateCategory(m: any): string {
  const text = `${m.owner}/${m.name} ${m.description ?? ""}`.toLowerCase();
  if (text.includes("flux") || text.includes("stable-diffusion") || text.includes("sdxl") || text.includes("ideogram") || text.includes("recraft")) return "text-to-image";
  if (text.includes("video") || text.includes("wan-2") || text.includes("i2v")) return "text-to-video";
  if (text.includes("whisper") || text.includes("transcri")) return "speech-to-text";
  if (text.includes("tts")) return "text-to-speech";
  if (text.includes("3d")) return "image-to-3d";
  if (text.includes("llama") || text.includes("claude") || text.includes("deepseek") || text.includes("chat")) return "llm";
  return "other";
}

async function fetchFireworks(apiKey: string): Promise<ModelPricing[]> {
  const res = await fetch("https://api.fireworks.ai/inference/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Fireworks: ${res.status}`);
  const data: any = await res.json();
  const models = data.data ?? data;

  return models
    .filter((m: any) => m.id?.startsWith("accounts/"))
    .map((m: any): ModelPricing => {
      const inputPerM = m.pricing?.input ?? -1;
      const outputPerM = m.pricing?.output ?? -1;

      return {
        id: m.id,
        name: m.id.split("/").pop()?.replace(/-/g, " ") || m.id,
        provider: "fireworks",
        category: "llm",
        pricing: {
          unit: "token",
          unitPrice: inputPerM >= 0 ? inputPerM / 1_000_000 : -1,
          inputPrice: inputPerM >= 0 ? inputPerM / 1_000_000 : undefined,
          outputPrice: outputPerM >= 0 ? outputPerM / 1_000_000 : undefined,
          formatted:
            inputPerM >= 0
              ? `$${inputPerM.toFixed(2)}/$${outputPerM.toFixed(2)} per 1M tokens (in/out)`
              : "Pricing unavailable",
        },
      };
    });
}

// ─── Artificial Analysis Benchmarks ───────────────────────────────────────────

async function fetchPerformanceStats(apiKey: string): Promise<Record<string, any>> {
  const res = await fetch("https://artificialanalysis.ai/api/v2/data/llms/models", {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`AA API error: ${res.status}`);
  const data: any = await res.json();
  const performanceMap: Record<string, any> = {};
  
  // Handle various response shapes: {data: [...]}, {models: [...]}, [...], or {slug: {...}, ...}
  let modelList: any[];
  if (Array.isArray(data)) {
    modelList = data;
  } else if (Array.isArray(data?.data)) {
    modelList = data.data;
  } else if (Array.isArray(data?.models)) {
    modelList = data.models;
  } else if (typeof data === "object" && data !== null) {
    // Dict keyed by slug/id — convert values to array, attach the key as slug
    modelList = Object.entries(data).map(([key, val]: [string, any]) => ({
      ...val,
      slug: val?.slug ?? key,
    }));
  } else {
    throw new Error("Unexpected AA API response shape");
  }
  
  for (const m of modelList) {
    if (m.slug) performanceMap[m.slug.toLowerCase()] = m;
    if (m.name) performanceMap[m.name.toLowerCase()] = m;
  }
  return performanceMap;
}

// ─── Cron: Refresh all pricing ──────────────────────────────────────────────

async function refreshPricing(env: Env): Promise<PricingSnapshot> {
  const allModels: ModelPricing[] = [];
  const providers: PricingSnapshot["providers"] = {};

  // OpenRouter — always works (public API)
  try {
    const models = await fetchOpenRouter();
    allModels.push(...models);
    providers["openrouter"] = { count: models.length, status: "ok" };
  } catch (e: any) {
    providers["openrouter"] = { count: 0, status: `error: ${e.message}` };
  }

  // fal.ai — needs FAL_KEY
  if (env.FAL_KEY) {
    try {
      const models = await fetchFal(env.FAL_KEY);
      allModels.push(...models);
      providers["fal"] = { count: models.length, status: "ok" };
    } catch (e: any) {
      providers["fal"] = { count: 0, status: `error: ${e.message}` };
    }
  } else {
    providers["fal"] = { count: 0, status: "skipped: no FAL_KEY" };
  }

  // Together AI
  if (env.TOGETHER_API_KEY) {
    try {
      const models = await fetchTogether(env.TOGETHER_API_KEY);
      allModels.push(...models);
      providers["together"] = { count: models.length, status: "ok" };
    } catch (e: any) {
      providers["together"] = { count: 0, status: `error: ${e.message}` };
    }
  } else {
    providers["together"] = { count: 0, status: "skipped: no TOGETHER_API_KEY" };
  }

  // Replicate
  if (env.REPLICATE_API_TOKEN) {
    try {
      const models = await fetchReplicate(env.REPLICATE_API_TOKEN);
      allModels.push(...models);
      providers["replicate"] = { count: models.length, status: "ok" };
    } catch (e: any) {
      providers["replicate"] = { count: 0, status: `error: ${e.message}` };
    }
  } else {
    providers["replicate"] = { count: 0, status: "skipped: no REPLICATE_API_TOKEN" };
  }

  // Fireworks
  if (env.FIREWORKS_API_KEY) {
    try {
      const models = await fetchFireworks(env.FIREWORKS_API_KEY);
      allModels.push(...models);
      providers["fireworks"] = { count: models.length, status: "ok" };
    } catch (e: any) {
      providers["fireworks"] = { count: 0, status: `error: ${e.message}` };
    }
  } else {
    providers["fireworks"] = { count: 0, status: "skipped: no FIREWORKS_API_KEY" };
  }

  // Fetch benchmark data if available
  let performanceStats: Record<string, any> = {};
  if (env.ARTIFICIAL_ANALYSIS_API_KEY) {
    try {
      performanceStats = await fetchPerformanceStats(env.ARTIFICIAL_ANALYSIS_API_KEY);
      providers["artificial_analysis"] = { count: Object.keys(performanceStats).length, status: "ok" };
    } catch (e: any) {
      providers["artificial_analysis"] = { count: 0, status: `error: ${e.message}` };
    }
  }

  // Merge benchmarks into models
  if (Object.keys(performanceStats).length > 0) {
    // Normalize function: strip dots, hyphens, underscores for fuzzy slug comparison
    const norm = (s: string) => s.toLowerCase().replace(/[-_.]/g, "");
    
    // Pre-build a normalized lookup for faster matching
    const normMap = new Map<string, any>();
    for (const [key, val] of Object.entries(performanceStats)) {
      normMap.set(norm(key), val);
    }
    
    for (const model of allModels) {
      if (!model.id) continue;
      const slug = model.id.split("/").pop()?.toLowerCase() || "";
      const normSlug = norm(slug);
      
      // Try exact normalized match first, then substring match
      let stats = normMap.get(normSlug);
      if (!stats) {
        for (const [nk, val] of normMap) {
          if (normSlug.includes(nk) || nk.includes(normSlug)) {
            stats = val;
            break;
          }
        }
      }
      
      if (stats) {
        const ttft = stats.median_time_to_first_token_seconds ?? undefined;
        const throughput = stats.median_output_tokens_per_second ?? undefined;
        const mmlu = stats.evaluations?.mmlu_pro != null ? stats.evaluations.mmlu_pro * 100 : undefined;
        const coding = stats.evaluations?.artificial_analysis_coding_index ?? undefined;
        const math = stats.evaluations?.artificial_analysis_math_index ?? undefined;
        
        if (ttft !== undefined || throughput !== undefined) {
          model.speed = { ttft, throughput };
        }
        if (mmlu !== undefined || coding !== undefined) {
          model.benchmarks = { mmlu, coding, math };
        }
      }
    }
  }

  const snapshot: PricingSnapshot = {
    models: allModels,
    updated_at: new Date().toISOString(),
    providers,
  };

  // Store in KV (TTL: 24 hours as safety)
  await env.PRICING_KV.put("pricing_snapshot", JSON.stringify(snapshot), {
    expirationTtl: 86400,
  });

  return snapshot;
}

// ─── CORS headers ───────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      ...CORS_HEADERS,
    },
  });
}

// ─── Worker ─────────────────────────────────────────────────────────────────

export default {
  // HTTP handler: serve cached pricing
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/health") {
      const snapshot = await env.PRICING_KV.get("pricing_snapshot");
      return jsonResponse({
        status: "ok",
        has_data: !!snapshot,
        updated_at: snapshot ? JSON.parse(snapshot).updated_at : null,
      });
    }

    // Provider status
    if (url.pathname === "/providers") {
      const snapshot = await env.PRICING_KV.get("pricing_snapshot");
      if (!snapshot) return jsonResponse({ error: "No data yet. Cron has not run." }, 503);
      const data: PricingSnapshot = JSON.parse(snapshot);
      return jsonResponse({
        providers: data.providers,
        total_models: data.models.length,
        updated_at: data.updated_at,
      });
    }

    // Main pricing endpoint
    if (url.pathname === "/" || url.pathname === "/pricing") {
      const snapshot = await env.PRICING_KV.get("pricing_snapshot");
      if (!snapshot) return jsonResponse({ error: "No data yet. Cron has not run." }, 503);

      const data: PricingSnapshot = JSON.parse(snapshot);

      // Optional filters
      const provider = url.searchParams.get("provider");
      const category = url.searchParams.get("category");

      let models = data.models;
      if (provider) models = models.filter((m) => m.provider === provider);
      if (category) models = models.filter((m) => m.category === category);

      return jsonResponse({
        models,
        total: models.length,
        updated_at: data.updated_at,
      });
    }

    // Force refresh (manual trigger)
    if (url.pathname === "/refresh") {
      const snapshot = await refreshPricing(env);
      return jsonResponse({
        message: "Pricing refreshed",
        total: snapshot.models.length,
        providers: snapshot.providers,
        updated_at: snapshot.updated_at,
      });
    }

    return jsonResponse({ error: "Not found. Try / or /health" }, 404);
  },

  // Cron handler: refresh pricing every 6 hours
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    console.log(`⏰ Cron trigger: refreshing pricing at ${new Date().toISOString()}`);
    const snapshot = await refreshPricing(env);
    console.log(`✅ Refreshed ${snapshot.models.length} models from ${Object.keys(snapshot.providers).length} providers`);
    
    // Check for provider errors to trigger Cloudflare Worker Error alerts
    const errors: string[] = [];
    for (const [name, info] of Object.entries(snapshot.providers)) {
      if (info.status.startsWith("error:")) {
        errors.push(`[${name.toUpperCase()}] ${info.status}`);
      }
    }
    
    if (errors.length > 0) {
      const errMsg = `Pricing refresh completed with provider errors: ${errors.join(", ")}`;
      console.error(`🚨 ${errMsg}`);
      throw new Error(errMsg);
    }
  },
} satisfies ExportedHandler<Env>;
