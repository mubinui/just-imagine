import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { toGeminiJsonSchema } from '@just-imagine/scene-schema';
import { SAFETY_SETTINGS } from './vertex';
import { GameScriptOutputSchema, type GenerateScript } from './imagine-game';

const OUTPUT_JSON_SCHEMA = toGeminiJsonSchema(
  z.toJSONSchema(GameScriptOutputSchema, { target: 'draft-7' }) as Record<string, unknown>,
);

/**
 * The script model for generated games: `gemini-4-argon` through Vertex AI in
 * us-central1 (Application Default Credentials), returning `{ kind, source }`.
 */
export class GameScriptModel {
  private client: GoogleGenAI;
  constructor(private config: { project: string; model: string; apiKey?: string }) {
    this.client = new GoogleGenAI(
      config.apiKey
        ? { apiKey: config.apiKey }
        : { vertexai: true, project: config.project, location: 'us-central1' },
    );
  }
  generate: GenerateScript = async (prompt) => {
    const response = await this.client.models.generateContent({
      model: this.config.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: OUTPUT_JSON_SCHEMA,
        safetySettings: SAFETY_SETTINGS,
        httpOptions: { timeout: 60000 },
      },
    });
    if (!response.text) throw new Error('Model returned no structured response');
    return JSON.parse(response.text) as unknown;
  };
}
