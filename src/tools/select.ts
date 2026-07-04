import type { ModelCategory, UnifiedModel } from "../types.js";

type SelectionGoal = "balanced" | "best" | "cheapest";
type Budget = "any" | "free" | "low";

interface UsageEstimate {
  input_tokens?: number;
  prompt_tokens?: number;
  output_tokens?: number;
  completion_tokens?: number;
  requests?: number;
  units?: number;
  images?: number;
  seconds?: number;
}

interface Candidate {
  model: UnifiedModel;
  score: number;
  valueScore: number;
  comparisonPrice: number | null;
  estimatedCost: number | null;
  reasons: string[];
  tradeoffs: string[];
}

const CATEGORY_ALIASES: Record<string, ModelCategory[]> = {
  image: ["text-to-image", "image-to-image"],
  "image generation": ["text-to-image"],
  "image editing": ["image-to-image"],
  img2img: ["image-to-image"],
  video: ["text-to-video", "image-to-video", "video-to-video"],
  "video generation": ["text-to-video"],
  img2vid: ["image-to-video"],
  tts: ["text-to-speech"],
  voice: ["text-to-speech"],
  speech: ["text-to-speech"],
  stt: ["speech-to-text"],
  transcription: ["speech-to-text"],
  transcribe: ["speech-to-text"],
  audio: ["text-to-audio"],
  "3d": ["image-to-3d"],
  embedding: ["embedding"],
  embeddings: ["embedding"],
  vision: ["vision", "llm"],
  llm: ["llm"],
  chat: ["llm"],
  text: ["llm"],
  code: ["llm"],
  coding: ["llm"],
  codebase: ["llm"],
  repository: ["llm"],
  repo: ["llm"],
  typescript: ["llm"],
  javascript: ["llm"],
  python: ["llm"],
  agent: ["llm"],
  reasoning: ["llm"],
};

const REQUIREMENT_ALIASES: Record<string, string[]> = {
  tool_use: ["tool_use", "tool", "tools", "function", "function calling"],
  tools: ["tool_use", "tool", "tools", "function", "function calling"],
  function: ["tool_use", "tool", "tools", "function", "function calling"],
  reasoning: ["reasoning", "reason", "think", "thinking"],
  coding: ["coding", "code", "programming"],
  vision: ["vision", "visual", "image"],
  "long context": ["long context", "context", "large context"],
  long_context: ["long context", "context", "large context"],
  structured_output: ["structured_output", "structured output", "json"],
  json: ["structured_output", "structured output", "json"],
  fast: ["fast", "speed", "low latency"],
  cheap: ["cheap", "low cost", "budget"],
};

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function usageEstimate(value: unknown): UsageEstimate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const usage: UsageEstimate = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      usage[key as keyof UsageEstimate] = raw;
    }
  }
  return usage;
}

function selectionGoal(value: unknown): SelectionGoal {
  const goal = String(value ?? "balanced").toLowerCase();
  return goal === "best" || goal === "cheapest" ? goal : "balanced";
}

function budgetConstraint(value: unknown): Budget {
  const budget = String(value ?? "any").toLowerCase();
  return budget === "free" || budget === "low" ? budget : "any";
}

function resolveCategories(text: string): ModelCategory[] {
  const lower = text.toLowerCase();
  const categories = new Set<ModelCategory>();

  for (const [alias, cats] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias)) {
      for (const category of cats) categories.add(category);
    }
  }

  return [...categories];
}

function expandRequirement(term: string): string[] {
  const lower = term.toLowerCase().replace(/_/g, " ").trim();
  const direct = REQUIREMENT_ALIASES[term.toLowerCase()] ?? REQUIREMENT_ALIASES[lower];
  return direct ?? [lower];
}

function modelText(model: UnifiedModel): string {
  return [
    model.id,
    model.name,
    model.description,
    model.category,
    ...model.capabilities,
    ...(model.tags ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/_/g, " ");
}

function hasRequirement(model: UnifiedModel, requirement: string): boolean {
  const text = modelText(model);
  return expandRequirement(requirement).some((term) => text.includes(term));
}

function tierScore(tier: UnifiedModel["qualityTier"]): number {
  switch (tier) {
    case "S":
      return 25;
    case "A":
      return 18;
    case "B":
      return 10;
    case "C":
      return 4;
    default:
      return 0;
  }
}

function comparisonPrice(model: UnifiedModel, usage: UsageEstimate): number | null {
  if (model.pricing.unitPrice < 0) return null;

  const estimated = estimatedUsageCost(model, usage);
  if (estimated !== null) return estimated;

  if (model.category === "llm") {
    const input = model.pricing.inputPrice;
    const output = model.pricing.outputPrice;
    if (input == null && output == null) return null;
    const inputPerMillion = (input ?? model.pricing.unitPrice) * 1_000_000;
    const outputPerMillion = (output ?? input ?? model.pricing.unitPrice) * 1_000_000;
    return (inputPerMillion + outputPerMillion) / 2;
  }

  return model.pricing.unitPrice;
}

function estimatedUsageCost(model: UnifiedModel, usage: UsageEstimate): number | null {
  if (model.pricing.unitPrice < 0) return null;

  if (model.category === "llm") {
    const inputTokens = usage.input_tokens ?? usage.prompt_tokens;
    const outputTokens = usage.output_tokens ?? usage.completion_tokens;
    if (inputTokens == null && outputTokens == null) return null;

    const requests = usage.requests ?? 1;
    const inputCost = (inputTokens ?? 0) * (model.pricing.inputPrice ?? model.pricing.unitPrice);
    const outputCost = (outputTokens ?? 0) * (model.pricing.outputPrice ?? model.pricing.unitPrice);
    return (inputCost + outputCost) * requests;
  }

  const units = usage.units ?? usage.images ?? usage.seconds ?? usage.requests;
  if (units == null) return null;
  return units * model.pricing.unitPrice;
}

function affordabilityScore(price: number | null): number {
  if (price === null) return -20;
  if (price === 0) return 35;
  return Math.max(0, 35 - Math.log10(price + 1) * 12);
}

function formatCost(cost: number | null): string {
  if (cost === null) return "not estimated";
  return `$${cost.toFixed(cost >= 1 ? 2 : 4)}`;
}

function summarizeCandidate(candidate: Candidate) {
  const { model } = candidate;
  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    category: model.category,
    qualityTier: model.qualityTier ?? null,
    pricing: model.pricing.formatted,
    comparisonPrice: candidate.comparisonPrice,
    estimatedCost: candidate.estimatedCost,
    score: Math.round(candidate.score),
    valueScore: Math.round(candidate.valueScore),
    reasons: candidate.reasons,
    tradeoffs: candidate.tradeoffs,
  };
}

function scoreModel(
  model: UnifiedModel,
  categories: ModelCategory[],
  terms: string[],
  requirements: string[],
  usage: UsageEstimate,
): Candidate | null {
  let score = 0;
  let isRelevant = false;
  const reasons: string[] = [];
  const tradeoffs: string[] = [];
  const text = modelText(model);

  if (categories.includes(model.category)) {
    score += 30;
    isRelevant = true;
    reasons.push(`matches ${model.category} project category`);
  }

  for (const requirement of requirements) {
    if (hasRequirement(model, requirement)) {
      score += 35;
      isRelevant = true;
      reasons.push(`matches requirement: ${requirement}`);
    } else {
      tradeoffs.push(`no clear ${requirement} signal`);
    }
  }

  for (const term of terms) {
    const normalized = term.toLowerCase().replace(/_/g, " ").trim();
    if (!normalized || normalized.length < 3) continue;

    if (model.capabilities.some((cap) => cap.toLowerCase().replace(/_/g, " ").includes(normalized))) {
      score += 8;
      isRelevant = true;
    } else if (model.tags?.some((tag) => tag.toLowerCase().includes(normalized))) {
      score += 4;
      isRelevant = true;
    } else if (text.includes(normalized)) {
      score += 2;
      isRelevant = true;
    }
  }

  if (model.qualityTier) {
    score += tierScore(model.qualityTier);
    reasons.push(`${model.qualityTier}-tier quality`);
  }

  const combined = terms.join(" ").toLowerCase();
  if ((combined.includes("code") || combined.includes("coding")) && model.benchmarks?.coding != null) {
    score += Math.min(15, model.benchmarks.coding / 6);
    reasons.push(`coding benchmark ${model.benchmarks.coding.toFixed(1)}`);
  }
  if ((combined.includes("reason") || combined.includes("smart") || combined.includes("intelligence")) && model.benchmarks?.mmlu != null) {
    score += Math.min(12, model.benchmarks.mmlu / 8);
    reasons.push(`MMLU ${model.benchmarks.mmlu.toFixed(1)}`);
  }
  if ((combined.includes("fast") || combined.includes("speed")) && model.speed?.throughput != null) {
    score += model.speed.throughput > 50 ? 8 : 4;
    reasons.push(`${model.speed.throughput.toFixed(1)} tokens/sec throughput`);
  }
  if ((combined.includes("long context") || combined.includes("large context") || combined.includes("context")) && model.contextLength) {
    score += Math.min(10, model.contextLength / 50_000);
    reasons.push(`${model.contextLength.toLocaleString()} token context`);
  }

  const price = comparisonPrice(model, usage);
  const estimatedCost = estimatedUsageCost(model, usage);
  if (price === null) {
    tradeoffs.push("pricing unavailable");
  } else if (price === 0) {
    reasons.push("free pricing");
  }

  if (!isRelevant) return null;

  return {
    model,
    score,
    valueScore: score + affordabilityScore(price),
    comparisonPrice: price,
    estimatedCost,
    reasons: [...new Set(reasons)].slice(0, 5),
    tradeoffs: [...new Set(tradeoffs)].slice(0, 4),
  };
}

function sortByPrice(a: Candidate, b: Candidate): number {
  if (a.comparisonPrice === null && b.comparisonPrice !== null) return 1;
  if (a.comparisonPrice !== null && b.comparisonPrice === null) return -1;
  if (a.comparisonPrice !== null && b.comparisonPrice !== null && a.comparisonPrice !== b.comparisonPrice) {
    return a.comparisonPrice - b.comparisonPrice;
  }
  return b.score - a.score;
}

function passesBudget(candidate: Candidate, budget: Budget): boolean {
  if (budget === "free") return candidate.comparisonPrice === 0;
  if (budget !== "low") return true;
  if (candidate.comparisonPrice === null) return false;
  return candidate.comparisonPrice <= 1;
}

export function handleSelectModelForProject(
  models: UnifiedModel[],
  args: Record<string, unknown>,
) {
  const project = String(args.project ?? "").trim();
  const task = String(args.task ?? "").trim();
  const requirements = stringArray(args.requirements);
  const budget = budgetConstraint(args.budget);
  const goal = selectionGoal(args.optimization_goal);
  const usage = usageEstimate(args.expected_usage);
  const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 20);

  if (!project && !task) {
    return {
      content: [{ type: "text" as const, text: "Please provide a `project` or `task` description." }],
      isError: true,
    };
  }

  const queryText = [project, task, ...requirements].filter(Boolean).join(" ");
  const categories = resolveCategories(queryText);
  const effectiveCategories = categories.length > 0 ? categories : ["llm" as const];
  const terms = [project, task, ...requirements]
    .flatMap((part) => part.split(/[\s,.;:/()]+/))
    .filter(Boolean);

  const scored = models
    .map((model) => scoreModel(model, effectiveCategories, terms, requirements, usage))
    .filter((candidate): candidate is Candidate => candidate !== null)
    .filter((candidate) => passesBudget(candidate, budget));

  if (scored.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: `No suitable models found for "${queryText}". Try broader requirements or a wider budget.`,
      }],
      structuredContent: {
        query: { project, task, requirements, budget, optimization_goal: goal },
        candidates: [],
      },
    };
  }

  const byOverall = [...scored].sort((a, b) => b.score - a.score);
  const byPrice = [...scored].sort(sortByPrice);
  const byValue = [...scored].sort((a, b) => b.valueScore - a.valueScore);

  const bestOverall = byOverall[0];
  const cheapest = byPrice[0];
  const bestValue = byValue[0];
  const ranked =
    goal === "cheapest"
      ? byPrice.slice(0, limit)
      : goal === "best"
        ? byOverall.slice(0, limit)
        : byValue.slice(0, limit);

  const lines = [
    `🧭 Model selection for project`,
    project ? `Project: ${project}` : "",
    task ? `Task: ${task}` : "",
    requirements.length ? `Requirements: ${requirements.join(", ")}` : "",
    "",
    `Best overall: **${bestOverall.model.name}** (${bestOverall.model.id}) — ${bestOverall.model.pricing.formatted}`,
    `Cheapest acceptable: **${cheapest.model.name}** (${cheapest.model.id}) — ${cheapest.model.pricing.formatted}`,
    `Best value: **${bestValue.model.name}** (${bestValue.model.id}) — ${bestValue.model.pricing.formatted}`,
    "",
    "| Rank | Model | Provider | Category | Price | Score | Why |",
    "|------|-------|----------|----------|-------|-------|-----|",
    ...ranked.map((candidate, index) => {
      const why = candidate.reasons.slice(0, 2).join("; ") || "matched project query";
      return `| ${index + 1} | ${candidate.model.id} | ${candidate.model.provider} | ${candidate.model.category} | ${candidate.model.pricing.formatted} | ${Math.round(candidate.score)} | ${why} |`;
    }),
  ].filter(Boolean);

  const structuredContent = {
    query: {
      project,
      task,
      requirements,
      budget,
      optimization_goal: goal,
      inferred_categories: effectiveCategories,
      expected_usage: usage,
    },
    best_overall: summarizeCandidate(bestOverall),
    cheapest_acceptable: summarizeCandidate(cheapest),
    best_value: summarizeCandidate(bestValue),
    candidates: ranked.map(summarizeCandidate),
    cost_basis: Object.keys(usage).length > 0
      ? "expected_usage"
      : "default unit comparison",
  };

  if (Object.keys(usage).length > 0) {
    lines.push(
      "",
      `Estimated usage cost: best overall ${formatCost(bestOverall.estimatedCost)}, cheapest ${formatCost(cheapest.estimatedCost)}, best value ${formatCost(bestValue.estimatedCost)}`,
    );
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    structuredContent,
  };
}
