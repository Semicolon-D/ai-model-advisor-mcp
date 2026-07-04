import type { UnifiedModel, ModelCategory } from "../types.js";

// ─── Category aliases for natural language matching ─────────────────────────

const CATEGORY_ALIASES: Record<string, ModelCategory[]> = {
  "image": ["text-to-image", "image-to-image"],
  "image generation": ["text-to-image"],
  "image gen": ["text-to-image"],
  "img2img": ["image-to-image"],
  "image editing": ["image-to-image"],
  "video": ["text-to-video", "image-to-video", "video-to-video"],
  "video generation": ["text-to-video"],
  "video gen": ["text-to-video"],
  "img2vid": ["image-to-video"],
  "tts": ["text-to-speech"],
  "speech": ["text-to-speech"],
  "voice": ["text-to-speech"],
  "stt": ["speech-to-text"],
  "transcription": ["speech-to-text"],
  "transcribe": ["speech-to-text"],
  "audio": ["text-to-audio"],
  "3d": ["image-to-3d"],
  "llm": ["llm"],
  "text": ["llm"],
  "chat": ["llm"],
  "code": ["llm"],
  "coding": ["llm"],
  "reasoning": ["llm"],
  "embedding": ["embedding"],
  "embeddings": ["embedding"],
  "vision": ["vision"],
};

function resolveCategories(task: string): ModelCategory[] {
  const lower = task.toLowerCase().trim();

  // Direct category match
  for (const [alias, cats] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias)) return cats;
  }

  // Fallback: return all categories
  return [];
}

function matchesRequirements(model: UnifiedModel, allTerms: string[], explicitReqs: string[]): { score: number, isRelevant: boolean } {
  let score = 0;
  let hasRelevance = false;

  const terms = allTerms.filter(Boolean).map((t) => t.toLowerCase().trim());
  const reqs = explicitReqs.filter(Boolean).map((r) => r.toLowerCase().trim());

  // 1. Explicit requirements (user checked a box or typed a specific capability)
  for (const req of reqs) {
    if (model.capabilities.some((c) => c.toLowerCase().includes(req) || c.replace(/_/g, " ").includes(req))) {
      score += 50; // Massively weight explicitly requested capabilities
      hasRelevance = true;
    }
  }

  // 2. Text matches against all terms (task + reqs)
  for (const term of terms) {
    if (model.capabilities.some((c) => c.toLowerCase().includes(term))) { score += 5; hasRelevance = true; }
    if (model.tags?.some((t) => t.toLowerCase().includes(term))) { score += 2; hasRelevance = true; }
    if (model.description.toLowerCase().includes(term)) { score += 1; hasRelevance = true; }
    if (model.name.toLowerCase().includes(term)) { score += 1; hasRelevance = true; }
  }

  // Quality tier bonus
  if (model.qualityTier === "S") score += 4;
  else if (model.qualityTier === "A") score += 3;
  else if (model.qualityTier === "B") score += 2;
  else if (model.qualityTier === "C") score += 1;

  // Benchmark and speed bonuses
  const reqStr = terms.join(" ");
  if (reqStr.includes("fast") || reqStr.includes("speed")) {
    if (model.speed?.throughput != null && model.speed.throughput > 50) { score += 4; hasRelevance = true; }
    if (model.speed?.ttft != null && model.speed.ttft > 0 && model.speed.ttft < 0.5) { score += 2; hasRelevance = true; }
  }
  
  if (reqStr.includes("code") || reqStr.includes("coding")) {
    if (model.benchmarks?.coding != null && model.benchmarks.coding > 60) { score += 4; hasRelevance = true; }
  }

  if (reqStr.includes("smart") || reqStr.includes("intelligence") || reqStr.includes("reason") || reqStr.includes("think")) {
    if (model.benchmarks?.mmlu != null && model.benchmarks.mmlu > 75) { score += 4; hasRelevance = true; }
  }

  return { score, isRelevant: hasRelevance };
}

export function handleRecommendModel(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const task = String(args.task ?? "");
  const requirements = (args.requirements as string[]) ?? [];
  const budget = String(args.budget ?? "").toLowerCase();
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);

  if (!task) {
    return {
      content: [{ type: "text" as const, text: "Please provide a `task` description (e.g. 'image generation', 'coding', 'transcription')." }],
      isError: true,
    };
  }

  // Analyze text to find potential categories (e.g. "image gen" -> text-to-image)
  const combinedText = [task, ...requirements].join(" ");
  const categories = resolveCategories(combinedText);

  let candidates = models;

  // Budget filter
  if (budget === "free") {
    candidates = candidates.filter((m) => m.pricing.unitPrice === 0);
  } else if (budget === "low") {
    candidates = candidates.filter((m) => {
      if (m.pricing.unitPrice < 0) return false;
      const price = m.pricing.unit === "token"
        ? m.pricing.unitPrice * 1_000_000
        : m.pricing.unitPrice;
      return price <= 1.0; // $1 per 1M tokens or $1 per media unit
    });
  }

  // Score and rank
  const scored = candidates.map((m) => {
    let { score, isRelevant } = matchesRequirements(m, [task, ...requirements], requirements);
    
    // Massive boost if model matches the inferred category
    if (categories.includes(m.category)) {
      score += 20;
      isRelevant = true;
    }
    
    // Boost if model name/description directly contains the task string
    if (task.length > 3 && (m.name.toLowerCase().includes(task.toLowerCase()) || m.description.toLowerCase().includes(task.toLowerCase()))) {
      score += 5;
      isRelevant = true;
    }
    
    return { model: m, score, isRelevant };
  });

  scored.sort((a, b) => b.score - a.score);
  // Only keep models with relevance
  const validScored = scored.filter((s) => s.isRelevant);
  const results = validScored.slice(0, limit);

  if (results.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: `No models found for task "${task}". Try broader terms like "image", "video", "llm", "tts", "stt", or "3d".`,
      }],
    };
  }

  const tierLabel = (t?: string) => t ? ` [${t}-tier]` : "";

  const lines = [
    `🎯 Top ${results.length} models for "${task}"${requirements.length ? ` (${requirements.join(", ")})` : ""}:`,
    "",
  ];

  for (let i = 0; i < results.length; i++) {
    const { model: m } = results[i];
    lines.push(
      `${i + 1}. **${m.name}** (${m.id})${tierLabel(m.qualityTier)}`,
      `   Provider: ${m.provider} | Category: ${m.category}`,
      `   💰 ${m.pricing.formatted}`,
      m.description ? `   ${m.description.slice(0, 150)}${m.description.length > 150 ? "..." : ""}` : "",
      "",
    );
  }

  return {
    content: [{ type: "text" as const, text: lines.filter(Boolean).join("\n") }],
  };
}
