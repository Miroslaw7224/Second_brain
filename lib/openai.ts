import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function generateChatCompletion(params: {
  model: string;
  messages: ChatMessage[];
}): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: params.model,
    messages: params.messages,
  });
  return (response.choices[0].message.content ?? "").trim();
}
