import type { UnifiedModel } from "../types.js";
import { modelMatchScore, normalizeModelName } from "../utils/fuzzy.js";

export function handleCompareModels(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const modelIds = args.model_ids as string[];
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    return {
      content: [{ type: "text" as const, text: "model_ids must be a non-empty array of model ID strings." }],
      isError: true,
    };
  }

  const found: UnifiedModel[] = [];
  const notFound: string[] = [];

  for (const id of modelIds) {
    let m = models.find((model) => model.id === id);
    
    if (!m) {
      const scored = models
        .map((model) => ({ model, score: modelMatchScore(id, model.id, model.name) }))
        .sort((a, b) => b.score - a.score);
      if (scored.length > 0 && scored[0].score >= 80) {
        m = scored[0].model;
      }
    }

    if (m) found.push(m);
    else notFound.push(id);
  }

  if (found.length === 0) {
    // Try lower confidence fuzzy matching for typing assistance
    const suggestions = modelIds.flatMap((id) =>
      models
        .map((m) => ({ model: m, score: modelMatchScore(id, m.id, m.name) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((s) => s.model.id)
    );

    let text = `None of the specified models were found: ${notFound.join(", ")}`;
    if (suggestions.length > 0) {
      text += `\n\nDid you mean one of these?\n  ${[...new Set(suggestions)].join("\n  ")}`;
    }
    return { content: [{ type: "text" as const, text }], isError: true };
  }

  // Determine which columns to show based on model mix
  const hasLLMs = found.some((m) => m.category === "llm");
  const hasMedia = found.some((m) => m.category !== "llm");

  const getAvailProviders = (m: UnifiedModel) => {
    const normId = normalizeModelName(m.id);
    const peers = models.filter((p) => p.provider !== m.provider && normalizeModelName(p.id) === normId);
    if (peers.length === 0) return "—";
    return [...new Set(peers.map((p) => p.provider))].join(", ");
  };

  let header: string;
  let separator: string;
  let rows: string[];

  if (hasLLMs && !hasMedia) {
    // All LLMs: show capabilities
    const capFlag = (m: UnifiedModel, ...caps: string[]) =>
      m.capabilities.some(c => caps.some(alias => c.toLowerCase().includes(alias))) ? "✅" : "❌";

    const fmtSpeed = (n?: number) => n !== undefined ? n.toFixed(1) : "—";
    const fmtMMLU = (n?: number) => n !== undefined ? n.toFixed(1) : "—";

    header = `| Model | Provider | Avail. | Pricing | Context/Output | Speed (TTFT/Tps) | MMLU | Tools | Reason | Vision | Quality |`;
    separator = `|-------|----------|--------|---------|----------------|------------------|------|-------|--------|--------|---------|`;
    rows = found.map((m) => {
      const ctx = m.contextLength ? `${Math.round(m.contextLength / 1000)}k` : "?";
      const out = m.maxOutputTokens ? `${Math.round(m.maxOutputTokens / 1000)}k` : "?";
      const ctxStr = m.contextLength || m.maxOutputTokens ? `${ctx} / ${out}` : "N/A";
      
      return `| ${m.id} | ${m.provider} | ${getAvailProviders(m)} | ${m.pricing.formatted} | ${ctxStr} | ${fmtSpeed(m.speed?.ttft)}s / ${fmtSpeed(m.speed?.throughput)} | ${fmtMMLU(m.benchmarks?.mmlu)} | ${capFlag(m, "tool")} | ${capFlag(m, "reason", "think")} | ${capFlag(m, "vision", "vlm")} | ${m.qualityTier ?? "—"} |`;
    });
  } else if (!hasLLMs && hasMedia) {
    // All media: show media-specific cols
    header = `| Model | Provider | Avail. | Category | Pricing | Quality | License |`;
    separator = `|-------|----------|--------|----------|---------|---------|---------|`;
    rows = found.map((m) =>
      `| ${m.id} | ${m.provider} | ${getAvailProviders(m)} | ${m.category} | ${m.pricing.formatted} | ${m.qualityTier ?? "—"} | ${m.licenseType ?? "—"} |`
    );
  } else {
    // Mixed: generic table
    header = `| Model | Provider | Avail. | Category | Pricing | Quality |`;
    separator = `|-------|----------|--------|----------|---------|---------|`;
    rows = found.map((m) =>
      `| ${m.id} | ${m.provider} | ${getAvailProviders(m)} | ${m.category} | ${m.pricing.formatted} | ${m.qualityTier ?? "—"} |`
    );
  }

  let text = `${header}\n${separator}\n${rows.join("\n")}`;
  if (notFound.length > 0) {
    text += `\n\n⚠️ Models not found: ${notFound.join(", ")}`;
  }

  return { content: [{ type: "text" as const, text }] };
}
