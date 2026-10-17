import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { toGeminiJsonSchema } from '@just-imagine/scene-schema';
import { SAFETY_SETTINGS } from './vertex';
import { GameScriptOutputSchema, type GenerateScript } from './imagine-game';
import { GameplayPlanSchema, gameplayPlanPrompt, type PlanGame } from './game-playtest';
import { traced } from '@just-imagine/server-core';

const OUTPUT_JSON_SCHEMA = toGeminiJsonSchema(
  z.toJSONSchema(GameScriptOutputSchema, { target: 'draft-7' }) as Record<string, unknown>,
);

/**
 * The script model for generated games: `gemini-4-argon` through Vertex AI in
 * an explicit model location (Application Default Credentials). No silent model fallback.
 */
export class GameScriptModel {
  private client: GoogleGenAI;
  constructor(
    private config: { project: string; model: string; apiKey?: string; location?: string },
  ) {
    this.client = new GoogleGenAI(
      config.apiKey
        ? { apiKey: config.apiKey }
        : { vertexai: true, project: config.project, location: config.location ?? 'global' },
    );
  }
  private async request(
    prompt: string,
    schema?: Record<string, unknown>,
    purpose: 'script' | 'plan' = 'script',
  ): Promise<unknown> {
    const response = await traced(`game_${purpose}_model`, { milestone: this.config.model }, () =>
      this.client.models.generateContent({
        model: this.config.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          ...(schema ? { responseJsonSchema: schema } : {}),
          safetySettings: SAFETY_SETTINGS,
          maxOutputTokens: purpose === 'plan' ? 12288 : 24000,
          ...(this.config.model.startsWith('gemini-4-')
            ? {
                thinkingConfig: {
                  thinkingLevel: purpose === 'plan' ? ThinkingLevel.MEDIUM : ThinkingLevel.HIGH,
                },
              }
            : {}),
          abortSignal: AbortSignal.timeout(100000),
          httpOptions: { timeout: 90000, retryOptions: { attempts: 1 } },
        },
      }),
    );
    if (!response.text) throw new Error('Model returned no structured response');
    return JSON.parse(response.text) as unknown;
  }
  generate: GenerateScript = async (prompt) => this.request(prompt, OUTPUT_JSON_SCHEMA);

  plan: PlanGame = async (doc, job, previous) => {
    const prompt = gameplayPlanPrompt(doc, job, previous);
    const schema = toGeminiJsonSchema(
      z.toJSONSchema(GameplayPlanSchema, { target: 'draft-7' }) as Record<string, unknown>,
    );
    try {
      return await this.request(prompt, schema, 'plan');
    } catch (error) {
      // Some Gemini endpoints reject deeply nested union contracts at request validation.
      // Retain the same model and strict local validation; retry only this format error.
      if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 400)
        throw error;
      return this.request(
        `${prompt}\nExact JSON contract (data): ${JSON.stringify(schema)}`,
        undefined,
        'plan',
      );
    }
  };
}
