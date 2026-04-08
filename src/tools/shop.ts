import type { UnifiedModel } from "../types.js";

// ─── Fuzzy model name matching ──────────────────────────────────────────────

/**
 * Normalize a model name for fuzzy matching across providers.
 * "meta-llama/Llama-3.3-70B-Instruct-Turbo" → "llama 3.3 70b instruct"
 */
function normalizeModelName(idOrName: string): string {
  return idOrName
    .toLowerCase()
    // Strip provider prefixes
    .replace(/^(accounts\/fireworks\/models\/|meta-llama\/|meta\/|deepseek-ai\/|qwen\/|mistralai\/|black-forest-labs\/|google\/|anthropic\/|fal-ai\/|wavespeedai\/)/, "")
    // Normalize Fireworks-style version strings: v3p3 → 3.3, v3p1 → 3.1
    .replace(/v(\d+)p(\d+)/g, "$1.$2")
    // Strip common suffixes (can appear multiple times)
    .replace(/[- ](turbo|fp8|free|instruct|chat|it|hf|preview)/gi, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function modelMatchScore(query: string, modelId: string, modelName: string): number {
  const q = normalizeModelName(query);
  const id = normalizeModelName(modelId);
  const name = modelName.toLowerCase();

  // Exact match on normalized id
  if (id === q) return 100;
  // Normalized id contains entire query
  if (id.includes(q)) return 80;
  // Name contains query
  if (name.includes(q)) return 70;
  // Query words present in id
  const queryWords = q.split(" ").filter(Boolean);
  const matchedWords = queryWords.filter((w) => id.includes(w) || name.includes(w));
  if (matchedWords.length === queryWords.length) return 60;
  if (matchedWords.length >= queryWords.length * 0.7) return 40;
  return 0;
}

// ─── Tool ───────────────────────────────────────────────────────────────────

export function handleFindCheapestProvider(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const query = String(args.model ?? "");
  if (!query) {
    return {
      content: [{ type: "text" as const, text: 'Missing required parameter: "model"' }],
      isError: true,
    };
  }

  // Score all models against the query
  const scored = models
    .map((m) => ({ model: m, score: modelMatchScore(query, m.id, m.name) }))
    .filter((s) => s.score >= 40)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No models matching "${query}" found across any provider.\n\nTip: Try shorter queries like "llama 70b", "flux pro", or "deepseek".`,
        },
      ],
    };
  }

  // Group by normalized name to find the "same" model across providers
  const topNorm = normalizeModelName(scored[0].model.id);
  const matches = scored.filter(
    (s) => s.score >= 40 && (normalizeModelName(s.model.id) === topNorm || s.score >= 60)
  );

  // Deduplicate: 1 entry per provider (cheapest from each)
  const byProvider = new Map<string, UnifiedModel>();
  for (const { model } of matches) {
    const existing = byProvider.get(model.provider);
    if (!existing || (model.pricing.unitPrice >= 0 && (existing.pricing.unitPrice < 0 || model.pricing.unitPrice < existing.pricing.unitPrice))) {
      byProvider.set(model.provider, model);
    }
  }

  const results = [...byProvider.values()];

  // Sort: cheapest first (models with known pricing before unknown)
  results.sort((a, b) => {
    if (a.pricing.unitPrice < 0 && b.pricing.unitPrice >= 0) return 1;
    if (b.pricing.unitPrice < 0 && a.pricing.unitPrice >= 0) return -1;
    return a.pricing.unitPrice - b.pricing.unitPrice;
  });

  const lines: string[] = [
    `🏷️ Price comparison for **"${query}"**`,
    "",
  ];

  // Determine if these are LLMs or media models
  const isLLM = results.some((m) => m.category === "llm");

  if (isLLM) {
    lines.push(
      "| Provider | Input $/1M | Output $/1M | Model ID |",
      "|----------|-----------|------------|----------|"
    );
    for (const m of results) {
      const inp = m.pricing.inputPrice != null && m.pricing.inputPrice >= 0
        ? `$${(m.pricing.inputPrice * 1_000_000).toFixed(2)}`
        : "—";
      const out = m.pricing.outputPrice != null && m.pricing.outputPrice >= 0
        ? `$${(m.pricing.outputPrice * 1_000_000).toFixed(2)}`
        : "—";
      lines.push(`| ${m.provider} | ${inp} | ${out} | \`${m.id}\` |`);
    }
  } else {
    lines.push(
      "| Provider | Price | Unit | Model ID |",
      "|----------|-------|------|----------|"
    );
    for (const m of results) {
      lines.push(
        `| ${m.provider} | ${m.pricing.formatted} | ${m.pricing.unit} | \`${m.id}\` |`
      );
    }
  }

  if (results.length > 0 && results[0].pricing.unitPrice >= 0) {
    lines.push("", `💡 Cheapest: **${results[0].provider}** — ${results[0].pricing.formatted}`);
  }

  lines.push("", `_Found across ${results.length} provider(s)._`);

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
