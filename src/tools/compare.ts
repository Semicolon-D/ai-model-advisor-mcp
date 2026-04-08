import type { UnifiedModel } from "../types.js";

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
    const m = models.find((model) => model.id === id);
    if (m) found.push(m);
    else notFound.push(id);
  }

  if (found.length === 0) {
    // Try fuzzy matching
    const suggestions = modelIds.flatMap((id) =>
      models
        .filter((m) => m.id.toLowerCase().includes(id.toLowerCase()))
        .slice(0, 3)
        .map((m) => m.id)
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

  let header: string;
  let separator: string;
  let rows: string[];

  if (hasLLMs && !hasMedia) {
    // All LLMs: show capabilities
    const capFlag = (m: UnifiedModel, cap: string) =>
      m.capabilities.includes(cap) ? "✅" : "❌";

    const fmtSpeed = (n?: number) => n !== undefined ? n.toFixed(1) : "—";
    const fmtMMLU = (n?: number) => n !== undefined ? n.toFixed(1) : "—";

    header = `| Model | Provider | Pricing | Context | Speed (TTFT/Tps) | MMLU | Tools | Reason | Vision | Quality |`;
    separator = `|-------|----------|---------|---------|------------------|------|-------|--------|--------|---------|`;
    rows = found.map((m) =>
      `| ${m.id} | ${m.provider} | ${m.pricing.formatted} | ${m.contextLength?.toLocaleString() ?? "N/A"} | ${fmtSpeed(m.speed?.ttft)}s / ${fmtSpeed(m.speed?.throughput)} | ${fmtMMLU(m.benchmarks?.mmlu)} | ${capFlag(m, "tool_use")} | ${capFlag(m, "reasoning")} | ${capFlag(m, "vision")} | ${m.qualityTier ?? "—"} |`
    );
  } else if (!hasLLMs && hasMedia) {
    // All media: show media-specific cols
    header = `| Model | Provider | Category | Pricing | Quality | License |`;
    separator = `|-------|----------|----------|---------|---------|---------|`;
    rows = found.map((m) =>
      `| ${m.id} | ${m.provider} | ${m.category} | ${m.pricing.formatted} | ${m.qualityTier ?? "—"} | ${m.licenseType ?? "—"} |`
    );
  } else {
    // Mixed: generic table
    header = `| Model | Provider | Category | Pricing | Quality |`;
    separator = `|-------|----------|----------|---------|---------|`;
    rows = found.map((m) =>
      `| ${m.id} | ${m.provider} | ${m.category} | ${m.pricing.formatted} | ${m.qualityTier ?? "—"} |`
    );
  }

  let text = `${header}\n${separator}\n${rows.join("\n")}`;
  if (notFound.length > 0) {
    text += `\n\n⚠️ Models not found: ${notFound.join(", ")}`;
  }

  return { content: [{ type: "text" as const, text }] };
}
