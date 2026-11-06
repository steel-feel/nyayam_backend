// Evidence image analysis via 0G Private Computer (Intel TDX TEE).
// z-image-turbo (the model the user first picked) is a text-to-image generator
// and cannot analyse images, so analysis runs on the vision-capable chat model
// 0GM-1.0-35B-A3B — still inside a TEE enclave, key stays server-side.
const VISION_URL =
  process.env.OG_VISION_URL ??
  "https://compute-network-20.integratenetwork.work/v1/proxy/chat/completions";
const VISION_MODEL = process.env.OG_VISION_MODEL ?? "0GM-1.0-35B-A3B";

const SYSTEM_PROMPT = `You are a forensic document examiner assisting an Indian court.
Examine the uploaded evidence exhibit image and return a concise, structured report in markdown:
1. **Exhibit type** — document/object classification (e.g. registered sale deed, invoice, photograph, screenshot).
2. **Visible text (OCR)** — transcribe all legible text verbatim.
3. **Key particulars** — parties, dates, amounts, reference/file numbers, signatures, stamps, seals.
4. **Authenticity observations** — signs of alteration, overwriting, inconsistent fonts/ink, metadata hints.
5. **Evidentiary relevance** — what a court could use this exhibit to establish.
Be factual; flag anything illegible instead of guessing.`;

export async function analyseEvidenceImage(image: Buffer, mime: string): Promise<string> {
  // pc.0g.ai keys are provider-scoped: the whisper key (0xE63C…502e) will NOT
  // work here. Mint a key for provider 0xf4FB…B250 on pc.0g.ai and set
  // OG_VISION_API_KEY in the backend .env.
  const apiKey = process.env.OG_VISION_API_KEY ?? process.env.OG_VISION_API_KEY;
  if (!apiKey) throw new Error("Missing OG_VISION_API_KEY in backend .env");

  const res = await fetch(VISION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyse this evidence exhibit." },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${image.toString("base64")}` },
            },
          ],
        },
      ],
      max_tokens: 2048,
      // Reasoning model — keep answers concise (see model card)
      chat_template_kwargs: { enable_thinking: false },
    }),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.error === "string"
        ? data.error
        : data?.error?.message || `0G vision provider error (${res.status})`;
    throw new Error(msg);
  }
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty analysis returned by the vision model");
  return text;
}
