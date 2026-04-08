import type { UnifiedModel } from "../types.js";

export function handleGetModelInfo(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const modelId = String(args.model_id ?? "");
  const model = models.find((m) => m.id === modelId);

  if (!model) {
    const fuzzy = models
      .filter((m) => m.id.toLowerCase().includes(modelId.toLowerCase()))
      .slice(0, 8);

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
