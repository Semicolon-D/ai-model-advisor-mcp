# AI Model Advisor MCP Server

The ultimate **Model Context Protocol (MCP)** server for AI model discovery and cost optimization. Fully compatible with **Claude Desktop**, **Cursor**, and any MCP client. 

Compare pricing, capabilities, and quality across **1000+ models** from **5 top providers** (OpenRouter, fal.ai, Together AI, Replicate, and Fireworks AI).

> **"Where's Llama 3.3 cheapest?"**
> Just ask your agent. It shops across all providers instantly.

## Why use this MCP Server?

New AI models drop constantly across dozens of platforms. Your AI coding agent (like Claude or Cursor) doesn't inherently know what's available, what inference costs, or which provider is currently cheapest. This MCP fixes that by giving your agent live, programmatic access to:

- 🧠 **300+ LLMs** via OpenRouter API (GPT-4o, Claude 3.7, Gemini 2.5, Llama, Mistral, DeepSeek)
- 🎨 **200+ Media models** via fal.ai API (Flux Pro, Stable Diffusion, Kling Video, Whisper)
- ⚡ **200+ Open-source models** via Together AI (Llama 3.3, Qwen, Mistral)
- 🔁 **Community models** via Replicate (Wan 2.1, Recraft, custom Loras)
- 🔥 **Fast inference models** via Fireworks AI
- 🏷️ **Cross-provider price calculator** — find the cheapest API endpoint for any architecture
- 💰 **Real-time pricing** — powered by our cloud backend (no API keys needed)
- ⭐ **Curated quality tiers** (S/A/B/C) to prevent agents from picking outdated models
- 🆕 **Discovery engine** — agents can ask "what new models dropped this week?"

## Quick Start

### Zero-config (No API keys required)

The server works **entirely out-of-the-box**. Just add it to your MCP settings and save:

```json
{
  "mcpServers": {
    "model-advisor": {
      "command": "npx",
      "args": ["-y", "ai-model-advisor-mcp@latest"]
    }
  }
}
```

That's it! Live pricing for **all 1,000+ models** across all 5 providers is fetched automatically using our hosted Cloudflare Worker Pricing API. No API keys, no environment variables, no setup.

## Tools (8 total)

### 🏷️ `find_cheapest_provider` ⭐ NEW

The killer feature. Shop for a model across all 5 providers.

```
find_cheapest_provider({ model: "llama 3.3 70b" })
```

Output:
```
🏷️ Price comparison for "llama 3.3 70b"

| Provider    | Input $/1M | Output $/1M | Model ID                                         |
|-------------|-----------|------------|--------------------------------------------------|
| OpenRouter  | $0.00     | $0.00      | meta-llama/llama-3.3-70b-instruct                |
| Together AI | $0.88     | $0.88      | meta-llama/Llama-3.3-70B-Instruct-Turbo          |
| Fireworks   | $0.90     | $0.90      | accounts/fireworks/models/llama-v3p3-70b-instruct |

💡 Cheapest: OpenRouter — FREE
```

Uses fuzzy matching — handles version format differences (v3p3 = 3.3) across providers.

### 📦 `batch_get_pricing` ⭐ NEW

Get pricing for multiple models in a single call. Returns a compact table.

```
batch_get_pricing({ model_ids: ["openai/gpt-4o", "anthropic/claude-sonnet-4", "fal-ai/flux-pro/v1.1", "meta-llama/Llama-3.3-70B-Instruct-Turbo"] })
```

### 🎯 `recommend_model`

"I need X" → ranked models matching your task, requirements, and budget. Searches all 5 providers.

```
recommend_model({ task: "image generation", requirements: ["photorealistic", "fast"], budget: "low" })
```

### ⚖️ `compare_models`

Side-by-side table across providers. Auto-adapts columns for LLMs vs media models.

```
compare_models({ model_ids: ["openai/gpt-4o", "anthropic/claude-sonnet-4", "google/gemini-2.5-pro-preview"] })
```

### 📋 `list_models`

Browse and filter by category, provider, capability, or price.

```
list_models({ category: "text-to-image", max_price: 0.05 })
list_models({ provider: "together", category: "llm" })
list_models({ provider: "replicate", category: "text-to-video" })
```

### 📖 `get_model_info`

Comprehensive model card with everything you need to decide.

```
get_model_info({ model_id: "fal-ai/flux-pro/v1.1" })
```

### 💰 `estimate_cost`

Cost estimation for any usage scenario.

```
estimate_cost({ model_id: "openai/gpt-4o", usage: { input_tokens: 1000000, output_tokens: 100000 } })
estimate_cost({ model_id: "fal-ai/flux-pro/v1.1", usage: { images: 500 } })
```

### 🆕 `whats_new`

Discover recently added models. Never miss a new release.

```
whats_new({ since: "7d" })
whats_new({ since: "30d", category: "text-to-video" })
```

## Providers

| Provider | Models | Type | Hosted Pricing Data |
|----------|--------|------|------------------|
| [OpenRouter](https://openrouter.ai) | 350+ | LLMs | ✅ Yes |
| [fal.ai](https://fal.ai) | 40+ | Image, Video, Audio, 3D | ✅ Yes |
| [Together AI](https://together.ai) | 220+ | LLMs, Image | ✅ Yes |
| [Replicate](https://replicate.com) | 120+ | Everything | ✅ Yes |
| [Fireworks AI](https://fireworks.ai) | 12+ | LLMs | ✅ Yes |

## Categories

| Category | Examples |
|----------|---------|
| `llm` | GPT-4o, Claude, Gemini, Llama, Mistral, DeepSeek |
| `text-to-image` | Flux Pro, Stable Diffusion, DALL-E, Ideogram, Recraft |
| `image-to-image` | Flux Edit, img2img pipelines, upscalers |
| `text-to-video` | Kling, Minimax, Hunyuan, Wan 2.1 |
| `image-to-video` | Kling i2v, Runway, Wan i2v |
| `text-to-speech` | Kokoro, ElevenLabs |
| `speech-to-text` | Wizper (Whisper) |
| `text-to-audio` | Music/sound generation |
| `image-to-3d` | Hunyuan3D, Trellis |
| `vision` | Visual understanding models |
| `embedding` | Text embedding models |

## Quality Tiers

Popular models are rated on a curated quality scale:

- **S** — Best in class (Claude Sonnet 4, GPT-4o, Flux Pro Ultra, Kling v2.0)
- **A** — Excellent (Gemini Flash, Llama 3.3, Flux Dev, Recraft v3)
- **B** — Good (Mistral Small, Flux Schnell, SD3.5 Turbo)
- **C** — Adequate

## Architecture

```
Agent → MCP Server → Cloudflare Worker Pricing API (Our Hosted Backend)
                         ├─ Fetches from OpenRouter (350+ models)
                         ├─ Fetches from fal.ai (40+ models)
                         ├─ Fetches from Together AI (220+ models)
                         ├─ Fetches from Replicate (120+ models)
                         └─ Fetches from Fireworks AI (12+ models)

Unified Model Registry
→ recommend, compare, list, info, estimate, shop, batch
```

The MCP Server connects to our blazing-fast Cloudflare Worker that aggregates live pricing data across all 5 providers on a recurring 6-hour cron schedule. This gives your agent real-time pricing awareness without requiring you to juggle 5 different API keys.

## License

MIT
