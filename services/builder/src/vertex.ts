import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { generatedSceneJsonSchema, patchOpsJsonSchema } from '@just-imagine/scene-schema';
import type { GenerateJson } from './pipeline';
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
      sceneModel: string;
      fastModel: string;
      heroModel: string;
      propModel: string;
    },
  ) {
    this.client = new GoogleGenAI({
      vertexai: true,
      project: config.project,
      location: 'us-central1',
    });
  }
  // Bound session state so one model outage does not permanently downgrade every child.
  private failedSceneSessions = new Set<string>();
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
    const response = await this.client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: kind === 'scene' ? generatedSceneJsonSchema() : patchOpsJsonSchema(),
        safetySettings: SAFETY_SETTINGS,
        httpOptions: { timeout: 6000 },
      },
    });
    if (!response.text) throw new Error('Model returned no structured response');
    return JSON.parse(response.text) as unknown;
  }
  async image(prompt: string, hero: boolean): Promise<Buffer> {
    const response = await this.client.models.generateContent({
      model: hero ? this.config.heroModel : this.config.propModel,
      contents: prompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        safetySettings: SAFETY_SETTINGS,
        httpOptions: { timeout: 20000 },
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
        httpOptions: { timeout: 8000 },
      },
    });
    const verdict = JSON.parse(response.text ?? '{}') as { safe?: unknown; matches?: unknown };
    return verdict.safe === true && verdict.matches === true;
  }
}
