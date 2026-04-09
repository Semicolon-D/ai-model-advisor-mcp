// ─── Fuzzy model name matching ──────────────────────────────────────────────

/**
 * Normalize a model name for fuzzy matching across providers.
 * "meta-llama/Llama-3.3-70B-Instruct-Turbo" → "llama 3.3 70b instruct"
 */
export function normalizeModelName(idOrName: string): string {
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

export function modelMatchScore(query: string, modelId: string, modelName: string): number {
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
