import type { UnifiedModel } from "../types.js";

export function handleBatchGetPricing(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const modelIds = (args.model_ids as string[] | undefined) ?? [];
  if (!modelIds.length) {
    return {
      content: [{ type: "text" as const, text: 'Missing required parameter: "model_ids" (array of model IDs)' }],
      isError: true,
    };
  }

  const found: UnifiedModel[] = [];
  const notFound: string[] = [];

  for (const id of modelIds) {
    const model = models.find(
      (m) => m.id === id || m.id.toLowerCase() === id.toLowerCase()
    );
    if (model) {
      found.push(model);
    } else {
      notFound.push(id);
    }
  }

  const lines: string[] = [
    `📦 Batch Pricing — ${found.length} found, ${notFound.length} not found`,
    "",
  ];

  // Separate LLMs and media models
  const llms = found.filter((m) => m.category === "llm");
  const media = found.filter((m) => m.category !== "llm");

  if (llms.length > 0) {
    lines.push(
      "### LLMs",
      "| Model | Provider | Input $/1M | Output $/1M |",
      "|-------|----------|-----------|------------|"
    );
    for (const m of llms) {
      const inp = m.pricing.inputPrice != null && m.pricing.inputPrice >= 0
        ? `$${(m.pricing.inputPrice * 1_000_000).toFixed(2)}`
        : "—";
      const out = m.pricing.outputPrice != null && m.pricing.outputPrice >= 0
        ? `$${(m.pricing.outputPrice * 1_000_000).toFixed(2)}`
        : "—";
      lines.push(`| ${m.name} | ${m.provider} | ${inp} | ${out} |`);
    }
    lines.push("");
  }

  if (media.length > 0) {
    lines.push(
      "### Media Models",
      "| Model | Provider | Price | Category |",
      "|-------|----------|-------|----------|"
    );
    for (const m of media) {
      lines.push(`| ${m.name} | ${m.provider} | ${m.pricing.formatted} | ${m.category} |`);
    }
    lines.push("");
  }

  if (notFound.length > 0) {
    lines.push(`### Not Found`, ...notFound.map((id) => `- \`${id}\``));
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
