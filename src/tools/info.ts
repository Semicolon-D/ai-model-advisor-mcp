import type { UnifiedModel } from "../types.js";
import { modelMatchScore } from "../utils/fuzzy.js";

export function handleGetModelInfo(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const modelId = String(args.model_id ?? "");
  let model = models.find((m) => m.id === modelId);

  if (!model) {
    const scored = models
      .map((m) => ({ model: m, score: modelMatchScore(modelId, m.id, m.name) }))
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score >= 80) {
      model = scored[0].model;
    } else {
      const fuzzy = scored.filter((s) => s.score > 0).slice(0, 8).map((s) => s.model);

      if (fuzzy.length > 0) {
        const suggestions = fuzzy.map((m) => `  ${m.id} (${m.provider}, ${m.category})`).join("\n");
        return {
          content: [{
            type: "text" as const,
            text: `Model "${modelId}" not found. Did you mean one of these?\n${suggestions}`,
          }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: `Model "${modelId}" not found.` }],
        isError: true,
      };
    }
  }

  const lines: string[] = [
    `# ${model.name}`,
    `**ID:** ${model.id}`,
    `**Provider:** ${model.provider}`,
    `**Category:** ${model.category}`,
    model.qualityTier ? `**Quality Tier:** ${model.qualityTier}` : "",
    "",
  ];

  if (model.description) {
    lines.push(`## Description`, model.description, "");
  }

  // Pricing section
  lines.push(`## Pricing`, `${model.pricing.formatted}`);
  if (model.pricing.inputPrice !== undefined) {
    const ip = model.pricing.inputPrice * 1_000_000;
    const op = (model.pricing.outputPrice ?? 0) * 1_000_000;
    lines.push(
      `- Input: $${ip.toFixed(2)} / 1M tokens`,
      `- Output: $${op.toFixed(2)} / 1M tokens`
    );
  }
  lines.push("");

  // LLM-specific
  if (model.category === "llm") {
    lines.push(`## Model Details`);
    if (model.contextLength) {
      lines.push(`- Context Length: ${model.contextLength.toLocaleString()} tokens`);
    }
    if (model.maxOutputTokens) {
      lines.push(`- Max Output: ${model.maxOutputTokens.toLocaleString()} tokens`);
    }
    lines.push("");
  }

  // Speed metrics
  if ((model.speed?.ttft != null && model.speed.ttft > 0) || (model.speed?.throughput != null && model.speed.throughput > 0)) {
    lines.push(`## Speed`);
    if (model.speed!.ttft != null && model.speed!.ttft > 0) lines.push(`- Time to First Token: ${model.speed!.ttft.toFixed(2)}s`);
    if (model.speed!.throughput != null && model.speed!.throughput > 0) lines.push(`- Throughput: ${model.speed!.throughput.toFixed(1)} tokens/sec`);
    lines.push("");
  }

  // Benchmark scores
  if (model.benchmarks?.mmlu !== undefined || model.benchmarks?.coding !== undefined || model.benchmarks?.math !== undefined) {
    lines.push(`## Benchmarks`);
    if (model.benchmarks.mmlu !== undefined) lines.push(`- MMLU: ${model.benchmarks.mmlu.toFixed(1)}`);
    if (model.benchmarks.coding !== undefined) lines.push(`- Coding: ${model.benchmarks.coding.toFixed(1)}`);
    if (model.benchmarks.math !== undefined) lines.push(`- Math: ${model.benchmarks.math.toFixed(1)}`);
    lines.push("");
  }

  // Capabilities
  if (model.capabilities.length > 0) {
    lines.push(
      `## Capabilities`,
      ...model.capabilities.map((c) => `- ✅ ${c.replace(/_/g, " ")}`),
      ""
    );
  }

  // Tags
  if (model.tags && model.tags.length > 0) {
    lines.push(`## Tags`, model.tags.join(", "), "");
  }

  // License
  if (model.licenseType) {
    lines.push(`**License:** ${model.licenseType}`);
  }

  // Added date
  if (model.addedDate) {
    lines.push(`**Added:** ${new Date(model.addedDate).toLocaleDateString()}`);
  }

  return {
    content: [{
      type: "text" as const,
      text: lines.filter((l) => l !== undefined).join("\n"),
    }],
  };
}
