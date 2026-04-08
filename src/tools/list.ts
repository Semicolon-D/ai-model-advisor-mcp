import type { UnifiedModel, ModelCategory, ProviderName } from "../types.js";

export function handleListModels(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const category = args.category as ModelCategory | undefined;
  const provider = args.provider as ProviderName | undefined;
  const capability = args.capability as string | undefined;
  const maxPrice = args.max_price as number | undefined;
  const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);

  let filtered = [...models];

  if (category) {
    filtered = filtered.filter((m) => m.category === category);
  }
  if (provider) {
    filtered = filtered.filter((m) => m.provider === provider);
  }
  if (capability) {
    const cap = capability.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.capabilities.some((c) => c.toLowerCase().includes(cap)) ||
        m.tags?.some((t) => t.toLowerCase().includes(cap))
    );
  }
  if (maxPrice !== undefined && maxPrice >= 0) {
    filtered = filtered.filter(
      (m) => m.pricing.unitPrice >= 0 && m.pricing.unitPrice <= maxPrice
    );
  }

  // Sort: quality tier first (S > A > B > C > unrated), then by price
  const tierOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
  filtered.sort((a, b) => {
    const ta = a.qualityTier ? tierOrder[a.qualityTier] : 9;
    const tb = b.qualityTier ? tierOrder[b.qualityTier] : 9;
    if (ta !== tb) return ta - tb;
    return a.pricing.unitPrice - b.pricing.unitPrice;
  });

  const results = filtered.slice(0, limit);

  if (results.length === 0) {
    const filters = [
      category && `category=${category}`,
      provider && `provider=${provider}`,
      capability && `capability=${capability}`,
      maxPrice !== undefined && `max_price=${maxPrice}`,
    ].filter(Boolean);

    return {
      content: [{
        type: "text" as const,
        text: `No models found matching filters: ${filters.join(", ")}.\n\nAvailable categories: llm, text-to-image, image-to-image, text-to-video, image-to-video, video-to-video, text-to-speech, speech-to-text, text-to-audio, image-to-3d, vision`,
      }],
    };
  }

  const tierBadge = (t?: string) => (t ? `[${t}]` : "");

  const lines = [
    `Found ${filtered.length} models${results.length < filtered.length ? ` (showing top ${results.length})` : ""}:`,
    "",
    ...results.map(
      (m, i) =>
        `${i + 1}. ${tierBadge(m.qualityTier)} ${m.id} (${m.provider})\n   ${m.category} | ${m.pricing.formatted}`
    ),
  ];

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
