# AI Model Advisor MCP Server

The ultimate **Model Context Protocol (MCP)** server for AI model discovery, cost optimization, and performance benchmarking. Fully compatible with **Claude Desktop**, **Cursor AI**, **Windsurf**, and any MCP client. 

Stop guessing which AI model to use. Give your agent the tools to compare pricing, intelligence benchmarks (MMLU/Coding), latency speed (TTFT), and throughput across **1000+ models** from **5 top AI platform providers** (OpenRouter, fal.ai, Together AI, Replicate, and Fireworks AI).

> **"Where is the cheapest Llama 3.3 endpoint?"**
> **"What is the fastest model for image generation under my budget?"**
> **"Which Claude 3.7 model has the highest coding benchmark?"**
> Just ask your agent. It shops across all providers instantly with real-time AI model pricing.

## Why use this Model Context Protocol Server?

New AI models drop constantly. Your AI coding agent (like Claude Desktop or Cursor) doesn't inherently know what's available, what API inference costs, or what the exact performance metrics are. This MCP fixes that by acting as a **live model catalog and routing engine**, giving your agent real-time access to:

- 🧠 **300+ LLMs** via OpenRouter API (GPT-4o, Claude 3.7, Gemini 2.5 Pro, Llama, Reasoning Models, DeepSeek V3/R1)
- 🎨 **200+ Media Models** via fal.ai API (Flux Pro, Stable Diffusion, Kling Video, Whisper)
- ⚡ **200+ Open-Source Models** via Together AI (Llama 3.3 70B, Qwen, Mistral)
- 🔁 **Community fine-tunes & LORAs** via Replicate (Wan 2.1, Recraft, Custom pipelines)
- 🔥 **Blazing Fast Inference endpoints** via Fireworks AI
- 🏷️ **Cross-Provider Price Calculator** — find the cheapest API endpoint / lowest cost LLM for any architecture.
- ⚡ **Live Speed & Latency Metrics** — powered by Artificial Analysis (TTFT and Tokens/sec throughput).
- 🏆 **Intelligence Leaderboards** — baked-in MMLU, Math, and Coding benchmark scores.
- 💰 **Real-Time Pricing** — powered by our cloud backend (Zero config, no API keys needed for pricing).
- ⭐ **Curated Quality Tiers** (S/A/B/C) to prevent agents from picking hallucinating or outdated models.
- 🆕 **Discovery Engine** — agents can ask "what new AI models dropped this week?"

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

## Tools (9 total)

### 🧭 `select_model_for_project` ⭐ NEW

One call for agents that already have project context. Returns the best overall model, cheapest acceptable model, and best value option without forcing the agent to manually chain several tools.

```
select_model_for_project({
  project: "TypeScript MCP server for coding agents",
  task: "coding assistant",
  requirements: ["coding", "reasoning", "tool_use"],
  expected_usage: { input_tokens: 5000000, output_tokens: 1000000 }
})
```

The server searches the catalog behind the scenes and returns a compact decision with model IDs, provider, price, quality tier, reasons, tradeoffs, and structured output that agents can parse.

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
→ select, recommend, compare, list, info, estimate, shop, batch
```

The MCP Server connects to our blazing-fast Cloudflare Worker that aggregates live pricing data across all 5 providers on a recurring 6-hour cron schedule. This gives your agent real-time pricing awareness without requiring you to juggle 5 different API keys.

## License

MIT
