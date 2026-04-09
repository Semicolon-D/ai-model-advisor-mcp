import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAllModels } from "./providers/registry.js";
import { handleListModels } from "./tools/list.js";
import { handleGetModelInfo } from "./tools/info.js";
import { handleRecommendModel } from "./tools/recommend.js";

/**
 * End-to-End Tests for model-advisor-mcp
 * 
 * Verifies that the server can successfully fetch from the production Cloudflare
 * Worker endpoint and that the core tools process the data correctly.
 */

describe("E2E - Cloudflare Worker Integration", { timeout: 15_000 }, () => {
  it("should fetch all models from the remote pricing API", async () => {
    const models = await getAllModels();
    
    // The worker should be returning OpenRouter, Together, Replicate, Fal, and Fireworks models
    assert.ok(models.length > 300, `Expected >300 models, got ${models.length}`);
    
    // Check coverage across providers (all 5 should be present if secrets are deployed)
    const providers = new Set(models.map(m => m.provider));
    
    // At minimum, OpenRouter requires no keys so it must be present
    assert.ok(providers.has("openrouter"), "OpenRouter models missing");
    
    console.log(`✅ Fetched ${models.length} live models from ${providers.size} providers: ${[...providers].join(", ")}`);
  });

  it("should list models from the live integration correctly", async () => {
    const models = await getAllModels();
    
    // Test listing cross-provider categories
    const listResult = handleListModels(models, { category: "text-to-image" });
    const listText = listResult.content[0].text;
    
    // The list should output numbered entries
    assert.ok(listText.includes("1. "), "Missing numbered list output");
  });

  it("should retrieve specific model info from live data", async () => {
    const models = await getAllModels();
    
    // Look up a known stable OpenRouter model
    const infoResult = handleGetModelInfo(models, { model_id: "openai/gpt-4o" });
    
    if (infoResult.isError) {
      assert.fail(`Failed to find openai/gpt-4o: ${infoResult.content[0].text}`);
    }
    
    const infoText = infoResult.content[0].text;
    assert.ok(infoText.includes("GPT-4o"), "Missing model name in card");
    assert.ok(infoText.includes("Pricing"), "Missing pricing info");
  });

  it("should properly recommend text-to-speech and other media models", async () => {
    const models = await getAllModels();
    
    // Check TTS
    const ttsResult = handleRecommendModel(models, { task: "text to speech generation and audio voices" });
    assert.equal(ttsResult.isError ?? false, false);
    const ttsText = ttsResult.content[0].text;
    assert.ok(ttsText.toLowerCase().includes("speech") || ttsText.toLowerCase().includes("audio") || ttsText.toLowerCase().includes("voice"), "Should contain TTS/audio models");
    
    // Check Video
    const videoResult = handleRecommendModel(models, { task: "video generation from text" });
    const videoText = videoResult.content[0].text;
    assert.ok(videoText.toLowerCase().includes("video") || videoText.toLowerCase().includes("kling") || videoText.toLowerCase().includes("luma"), "Should contain video models");
  });
});
