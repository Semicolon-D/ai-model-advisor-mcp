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

function matchesRequirements(model: UnifiedModel, requirements: string[]): number {
  let score = 0;
  const lower = requirements.map((r) => r.toLowerCase());

  for (const req of lower) {
    // Check capabilities
    if (model.capabilities.some((c) => c.toLowerCase().includes(req))) score += 2;
    // Check tags
    if (model.tags?.some((t) => t.toLowerCase().includes(req))) score += 1;
    // Check description
    if (model.description.toLowerCase().includes(req)) score += 1;
    // Check name
    if (model.name.toLowerCase().includes(req)) score += 1;
  }

  // Quality tier bonus
  if (model.qualityTier === "S") score += 4;
  else if (model.qualityTier === "A") score += 3;
  else if (model.qualityTier === "B") score += 2;
  else if (model.qualityTier === "C") score += 1;

  return score;
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

  // Filter by category
  const categories = resolveCategories(task);
  let candidates = categories.length > 0
    ? models.filter((m) => categories.includes(m.category))
    : models.filter((m) =>
        m.name.toLowerCase().includes(task.toLowerCase()) ||
        m.description.toLowerCase().includes(task.toLowerCase())
      );

  // Budget filter
  if (budget === "free") {
    candidates = candidates.filter((m) => m.pricing.unitPrice === 0);
  } else if (budget === "low") {
    candidates = candidates.filter((m) => m.pricing.unitPrice >= 0);
    candidates.sort((a, b) => a.pricing.unitPrice - b.pricing.unitPrice);
  }

  // Score and rank
  const scored = candidates.map((m) => ({
    model: m,
    score: matchesRequirements(m, [task, ...requirements]),
  }));

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, limit);

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
