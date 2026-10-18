import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import {
  generatedSceneJsonSchema,
  patchOpsJsonSchema,
  toGeminiJsonSchema,
} from '@just-imagine/scene-schema';
import type { GenerateJson, ReviewScene } from './pipeline';
import { CreationReviewSchema, creationReviewPrompt } from './creation-review';
import { logEvent, vertexModelLocation } from '@just-imagine/server-core';
export const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE }));
export class VertexModels {
  private client: GoogleGenAI;
  constructor(
    private config: {
      project: string;
      apiKey?: string;
      sceneModel: string;
      fastModel: string;
      heroModel: string;
      propModel: string;
    },
  ) {
    this.client = new GoogleGenAI(
      config.apiKey
        ? { apiKey: config.apiKey }
        : { vertexai: true, project: config.project, location: vertexModelLocation() },
    );
  }
  // Bound session state so one model outage does not permanently downgrade every child.
  private failedSceneSessions = new Set<string>();
  private jsonModeModels = new Set<string>();
  reviewScene: ReviewScene = async (doc, job, before) => {
    const response = await this.client.models.generateContent({
      model: this.config.fastModel,
      contents: creationReviewPrompt(doc, job, before),
      config: {
        responseMimeType: 'application/json',
        safetySettings: SAFETY_SETTINGS,
        maxOutputTokens: 2048,
        abortSignal: AbortSignal.timeout(20000),
        httpOptions: { timeout: 15000, retryOptions: { attempts: 1 } },
      },
    });
    const verdict = CreationReviewSchema.parse(JSON.parse(response.text ?? '{}'));
    logEvent('scene_request_review', {
      jobId: job.jobId,
      success: verdict.approved,
      count: verdict.issues.length,
    });
    return verdict.approved ? null : verdict.issues.join('\n');
  };
  generate: GenerateJson = async (prompt, kind, sessionId) => {
    const preferred =
      kind === 'scene' && !(sessionId && this.failedSceneSessions.has(sessionId))
        ? this.config.sceneModel
        : this.config.fastModel;
    try {
      return await this.generateWithModel(preferred, prompt, kind);
    } catch (error) {
      if (kind !== 'scene' || preferred === this.config.fastModel) throw error;
      if (sessionId) {
        this.failedSceneSessions.add(sessionId);
        if (this.failedSceneSessions.size > 1000)
          this.failedSceneSessions.delete(this.failedSceneSessions.values().next().value!);
      }
      return this.generateWithModel(this.config.fastModel, prompt, kind);
    }
  };
  private async generateWithModel(
    model: string,
    prompt: string,
    kind: 'scene' | 'patch',
  ): Promise<unknown> {
    const schema = kind === 'scene' ? generatedSceneJsonSchema() : patchOpsJsonSchema();
    const key = `${model}:${kind}`;
    const request = (structured: boolean) =>
      this.client.models.generateContent({
        model,
        contents: structured
          ? prompt
          : `${prompt}\nOutput JSON contract (follow exactly): ${JSON.stringify(schema)}`,
        config: {
          responseMimeType: 'application/json',
          ...(structured ? { responseJsonSchema: toGeminiJsonSchema(schema) } : {}),
          safetySettings: SAFETY_SETTINGS,
          httpOptions: { timeout: 60000 },
        },
      });
    let response;
    if (this.jsonModeModels.has(key)) response = await request(false);
    else {
      try {
        response = await request(true);
      } catch (error) {
        // Gemini rejects some deeply nested union schemas at request validation.
        // JSON mode still passes through the same strict DSL and physics validators.
        if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 400)
          throw error;
        this.jsonModeModels.add(key);
        response = await request(false);
      }
    }
    if (!response.text) throw new Error('Model returned no structured response');
    return JSON.parse(response.text) as unknown;
  }
  async story(prompt: string): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model: this.config.fastModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 16384,
        safetySettings: SAFETY_SETTINGS,
        abortSignal: AbortSignal.timeout(65000),
        httpOptions: { timeout: 60000, retryOptions: { attempts: 1 } },
      },
    });
    if (!response.text) throw new Error('No story returned');
    return JSON.parse(response.text) as unknown;
  }
  async image(
    prompt: string,
    hero: boolean,
    backdrop = false,
    bounded = false,
    options?: { imageSize?: '1K' | '2K'; reference?: Buffer },
  ): Promise<Buffer> {
    const response = await this.client.models.generateContent({
      model: hero ? this.config.heroModel : this.config.propModel,
      contents: options?.reference
        ? [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: { mimeType: 'image/png', data: options.reference.toString('base64') },
                },
              ],
            },
          ]
        : prompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: backdrop
          ? { aspectRatio: '16:9', imageSize: '2K' }
          : { aspectRatio: '1:1', imageSize: options?.imageSize ?? '1K' },
        safetySettings: SAFETY_SETTINGS,
        ...(bounded ? { abortSignal: AbortSignal.timeout(65000) } : {}),
        httpOptions: { timeout: 60000, ...(bounded ? { retryOptions: { attempts: 1 } } : {}) },
      },
    });
    const image = response.candidates
      ?.flatMap((c) => c.content?.parts ?? [])
      .find((p) => p.inlineData?.mimeType?.startsWith('image/'))?.inlineData;
    if (!image?.data) throw new Error('Model returned no image');
    return Buffer.from(image.data, 'base64');
  }
  async safeImage(data: Buffer, description: string): Promise<boolean> {
    const response = await this.client.models.generateContent({
      model: this.config.fastModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Is this appropriate for a six-year-old and does it match this description? ${JSON.stringify(description)}. Return {"safe":boolean,"matches":boolean}.`,
            },
            { inlineData: { mimeType: 'image/webp', data: data.toString('base64') } },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        safetySettings: SAFETY_SETTINGS,
        abortSignal: AbortSignal.timeout(20000),
        httpOptions: { timeout: 15000, retryOptions: { attempts: 1 } },
      },
    });
    const verdict = JSON.parse(response.text ?? '{}') as { safe?: unknown; matches?: unknown };
    return verdict.safe === true && verdict.matches === true;
  }
}
