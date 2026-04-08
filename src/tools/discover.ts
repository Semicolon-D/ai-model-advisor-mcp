import type { UnifiedModel, ModelCategory } from "../types.js";

export function handleWhatsNew(
  models: UnifiedModel[],
  args: Record<string, unknown>
) {
  const sinceStr = String(args.since ?? "7d");
  const category = args.category as ModelCategory | undefined;
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);

  // Parse time window
  const match = sinceStr.match(/^(\d+)(d|h|w)$/);
  if (!match) {
    return {
      content: [{
        type: "text" as const,
        text: `Invalid "since" format. Use "7d" (days), "24h" (hours), or "2w" (weeks).`,
      }],
      isError: true,
    };
  }

  const amount = parseInt(match[1]);
  const unit = match[2];
  let msAgo: number;
  switch (unit) {
    case "h": msAgo = amount * 60 * 60 * 1000; break;
    case "d": msAgo = amount * 24 * 60 * 60 * 1000; break;
    case "w": msAgo = amount * 7 * 24 * 60 * 60 * 1000; break;
    default: msAgo = 7 * 24 * 60 * 60 * 1000;
  }

  const cutoff = Date.now() - msAgo;

  let recent = models.filter((m) => {
    if (!m.addedDate) return false;
    return new Date(m.addedDate).getTime() >= cutoff;
  });

  if (category) {
    recent = recent.filter((m) => m.category === category);
  }

  // Sort newest first
  recent.sort((a, b) => {
    const da = a.addedDate ? new Date(a.addedDate).getTime() : 0;
    const db = b.addedDate ? new Date(b.addedDate).getTime() : 0;
    return db - da;
  });

  const results = recent.slice(0, limit);

  if (results.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: `No new models found in the last ${sinceStr}${category ? ` for category "${category}"` : ""}. Try a wider window like "30d" or "4w".`,
      }],
    };
  }

  const tierBadge = (t?: string) => (t ? ` [${t}]` : "");

  const lines = [
    `🆕 ${results.length} new models in the last ${sinceStr}${category ? ` (${category})` : ""}:`,
    "",
    ...results.map((m, i) => {
      const date = m.addedDate ? new Date(m.addedDate).toLocaleDateString() : "?";
      return `${i + 1}. ${m.name} (${m.id})${tierBadge(m.qualityTier)}\n   ${m.provider} | ${m.category} | ${m.pricing.formatted} | Added: ${date}`;
    }),
  ];

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
