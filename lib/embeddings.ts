import { HfInference } from "@huggingface/inference";

// @huggingface/inference is a lightweight HTTP client — no local model download.
// It calls HF's hosted inference API over the network, same as a fetch() call.
// Install: npm install @huggingface/inference

const MODEL = "sentence-transformers/all-MiniLM-L6-v2";

function getClient() {
  return new HfInference(process.env.HF_TOKEN);
}

export async function embedText(text: string): Promise<number[]> {
  const hf = getClient();
  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: text,
  });
  // Returns a flat number[] for a single string input
  return result as number[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const hf = getClient();
  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: texts,
  });
  // Returns number[][] for array input
  return result as number[][];
}

export function chunkText(
  text: string,
  chunkSize = 400,
  overlap = 60
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ").trim();
    if (chunk) chunks.push(chunk);
    i += chunkSize - overlap;
  }

  return chunks;
}