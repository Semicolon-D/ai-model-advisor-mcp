import { cached } from "../cache.js";
import type { UnifiedModel, ModelProvider, ModelCategory } from "../types.js";

// ─── Raw OpenRouter types ───────────────────────────────────────────────────

interface ORModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
  };
  context_length: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
  };
  top_provider?: {
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
  knowledge_cutoff?: string | null;
  created?: number;
}

// ─── Capability derivation ──────────────────────────────────────────────────

function deriveCapabilities(m: ORModel): string[] {
  const caps: string[] = [];
  const params = m.supported_parameters ?? [];
  const inp = m.architecture?.input_modalities ?? [];
  const out = m.architecture?.output_modalities ?? [];

  if (params.includes("tools") || params.includes("tool_choice")) caps.push("tool_use");
  if (params.includes("reasoning") || params.includes("include_reasoning")) caps.push("reasoning");
  if (params.includes("structured_outputs") || params.includes("response_format")) caps.push("structured_output");
  if (inp.includes("image")) caps.push("vision");
  if (inp.includes("audio")) caps.push("audio_input");
  if (out.includes("audio")) caps.push("audio_output");
  if (out.includes("image")) caps.push("image_output");
  if (inp.includes("file")) caps.push("file_input");

  return caps;
}

function deriveCategory(m: ORModel): ModelCategory {
  const modality = m.architecture?.modality ?? "";
  if (modality.includes("->image")) return "text-to-image";
  if (modality.includes("->audio")) return "text-to-speech";
  return "llm";
}

// ─── Cost formatting ────────────────────────────────────────────────────────

function formatLLMPricing(promptCost: string, completionCost: string): string {
  const p = parseFloat(promptCost) * 1_000_000;
  const c = parseFloat(completionCost) * 1_000_000;
  if (p === 0 && c === 0) return "FREE";
  return `$${p.toFixed(2)}/$${c.toFixed(2)} per 1M tokens (in/out)`;
}

// ─── Provider ───────────────────────────────────────────────────────────────

async function fetchOpenRouterModels(): Promise<UnifiedModel[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch("https://openrouter.ai/api/v1/models", { headers });
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const models = data.data as ORModel[];

  return models.map((m): UnifiedModel => ({
    id: m.id,
    name: m.name,
    provider: "openrouter",
    description: m.description ?? "",
    category: deriveCategory(m),
    pricing: {
      unit: "token",
      unitPrice: parseFloat(m.pricing.prompt),
      inputPrice: parseFloat(m.pricing.prompt),
      outputPrice: parseFloat(m.pricing.completion),
      formatted: formatLLMPricing(m.pricing.prompt, m.pricing.completion),
    },
    capabilities: deriveCapabilities(m),
    addedDate: m.created ? new Date(m.created * 1000).toISOString() : undefined,
    contextLength: m.context_length,
    maxOutputTokens: m.top_provider?.max_completion_tokens ?? undefined,
    tags: m.supported_parameters,
  }));
}

export const openrouterProvider: ModelProvider = {
  name: "openrouter",
  fetchModels: () => cached("openrouter", fetchOpenRouterModels),
};
