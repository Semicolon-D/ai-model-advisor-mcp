# ai-model-advisor-mcp

The most comprehensive AI model advisor MCP server. Compare pricing, capabilities, and quality across **500+ models** — LLMs, image gen, video gen, TTS, STT, and 3D — from OpenRouter and fal.ai.

> **"I need to generate images — what's the best model for my budget?"**
> Just ask. Your agent now knows.

## Why?

New AI models drop constantly. Your coding agent has no idea what's available, what things cost, or which model is best for your task. This MCP fixes that — giving your agent live access to:

- 🧠 **300+ LLMs** via OpenRouter (GPT-4o, Claude, Gemini, Llama, Mistral, etc.)
- 🎨 **200+ Media models** via fal.ai (Flux, Stable Diffusion, Kling Video, Whisper, etc.)
- 💰 **Live pricing** for every model
- ⭐ **Curated quality tiers** (S/A/B/C) for 50+ popular models
- 🆕 **New model discovery** — know when models drop

## Quick Start

### Claude Desktop / Antigravity / Cursor

Add to your MCP config:

```json
{
  "mcpServers": {
    "model-advisor": {
      "command": "npx",
      "args": ["-y", "ai-model-advisor-mcp"],
      "env": {
        "FAL_KEY": "your-fal-key-here",
        "OPENROUTER_API_KEY": "your-openrouter-key-here"
      }
    }
  }
}
```

### API Keys

| Key | Required? | What it enables |
|-----|-----------|----------------|
| `FAL_KEY` | Optional | fal.ai pricing data (model listing works without it) |
| `OPENROUTER_API_KEY` | Optional | Better rate limits for OpenRouter API |

**Both keys are optional.** The server works without them — you'll get model listings and capabilities, just without fal.ai pricing.

## Tools

### 🎯 `recommend_model`

"I need X" → ranked models matching your task, requirements, and budget.

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
list_models({ provider: "fal", category: "text-to-video" })
list_models({ capability: "reasoning" })
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

## Categories

| Category | Examples |
|----------|---------|
| `llm` | GPT-4o, Claude, Gemini, Llama, Mistral |
| `text-to-image` | Flux Pro, Stable Diffusion, DALL-E |
| `image-to-image` | Flux Edit, img2img pipelines |
| `text-to-video` | Kling, Minimax, Hunyuan |
| `image-to-video` | Kling i2v, Runway |
| `text-to-speech` | Kokoro, ElevenLabs |
| `speech-to-text` | Wizper (Whisper) |
| `text-to-audio` | Music/sound generation |
| `image-to-3d` | Hunyuan3D, Trellis |
| `vision` | Visual understanding models |

## Quality Tiers

Popular models are rated on a curated quality scale:

- **S** — Best in class (Claude Sonnet 4, GPT-4o, Flux Pro Ultra, Kling v2.0)
- **A** — Excellent (Gemini Flash, Llama 3.3, Flux Dev, Recraft v3)
- **B** — Good (Mistral Small, Flux Schnell, SD3.5 Turbo)
- **C** — Adequate

## Data Sources

| Provider | Models | Auth | What |
|----------|--------|------|------|
| [OpenRouter](https://openrouter.ai) | 300+ LLMs | Optional | Pricing, capabilities, descriptions, params |
| [fal.ai](https://fal.ai) | 200+ media models | Optional (pricing only) | Image/video/audio/3D models with pricing |

## License

MIT
