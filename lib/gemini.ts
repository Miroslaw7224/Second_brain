import { GoogleGenAI } from "@google/genai";

let client: InstanceType<typeof GoogleGenAI> | null = null;

function getClient(): InstanceType<typeof GoogleGenAI> {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export type GenerateContentParams = {
  model: string;
  contents: string;
  systemInstruction?: string;
};

export async function generateContent(params: GenerateContentParams): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: params.model,
    contents: params.contents,
    config: params.systemInstruction ? { systemInstruction: params.systemInstruction } : undefined,
  });
  return (response.text ?? "").trim();
}
