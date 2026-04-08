import type { UnifiedModel } from "../types.js";

export function handleEstimateCost(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const modelId = String(args.model_id ?? "");
  const model = models.find((m) => m.id === modelId);

  if (!model) {
    return {
      content: [{ type: "text" as const, text: `Model "${modelId}" not found.` }],
      isError: true,
    };
  }

  const usage = (args.usage as Record<string, number>) ?? {};

  const lines: string[] = [
    `💰 Cost Estimate for **${model.name}** (${model.id})`,
    `Provider: ${model.provider}`,
    "",
  ];

  let totalCost = 0;

  if (model.category === "llm") {
    // LLM cost estimation
    const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
    const requests = usage.requests ?? 1;

    const inputCost = inputTokens * (model.pricing.inputPrice ?? 0);
    const outputCost = outputTokens * (model.pricing.outputPrice ?? 0);
    totalCost = (inputCost + outputCost) * requests;

    lines.push(
      `## Usage`,
      `- Input tokens: ${inputTokens.toLocaleString()}`,
      `- Output tokens: ${outputTokens.toLocaleString()}`,
      `- Requests: ${requests.toLocaleString()}`,
      "",
      `## Cost Breakdown`,
      `- Input cost: $${(inputCost * requests).toFixed(6)}`,
      `- Output cost: $${(outputCost * requests).toFixed(6)}`,
    );
  } else {
    // Media cost estimation (per-unit)
    const units = usage.units ?? usage.images ?? usage.seconds ?? usage.requests ?? 1;

    if (model.pricing.unitPrice < 0) {
      lines.push(`⚠️ Pricing data unavailable. Set FAL_KEY for fal.ai pricing.`);
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }

    totalCost = units * model.pricing.unitPrice;

    lines.push(
      `## Usage`,
      `- Units (${model.pricing.unit}): ${units.toLocaleString()}`,
      `- Unit price: $${model.pricing.unitPrice.toFixed(4)} / ${model.pricing.unit}`,
      "",
      `## Cost Breakdown`,
      `- Total: ${units} × $${model.pricing.unitPrice.toFixed(4)}`,
    );
  }

  lines.push(
    "",
    `## Total Estimated Cost`,
    `**$${totalCost.toFixed(4)}**`,
  );

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
