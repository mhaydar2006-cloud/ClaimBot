export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return response.status(503).json({ error: "OPENAI_API_KEY is not configured" });
  }

  const { text, diagnosis, service } = request.body ?? {};
  if (typeof text !== "string" || !text.trim()) {
    return response.status(400).json({ error: "A physician-provided justification is required" });
  }

  const input = [
    "Rewrite the following physician-provided clinical justification for clarity and professional administrative submission.",
    "Hard rules:",
    "- Preserve the exact factual meaning.",
    "- Do not invent symptoms, duration, exam findings, diagnoses, previous treatments, failed therapies, severity, medical necessity claims, or payer criteria.",
    "- Do not claim that insurance coverage or authorization is guaranteed.",
    "- Do not add facts merely because they would strengthen the request.",
    "- Return only the rewritten justification, with no heading or commentary.",
    `Requested service: ${typeof service === "string" ? service : "not provided"}`,
    `Diagnosis/motive supplied: ${typeof diagnosis === "string" ? diagnosis : "not provided"}`,
    `Physician text: ${text.trim()}`,
  ].join("\n");

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6",
        reasoning: { effort: "low" },
        max_output_tokens: 500,
        input,
      }),
    });

    const payload = await openAIResponse.json();
    if (!openAIResponse.ok) {
      return response.status(openAIResponse.status).json({
        error: payload?.error?.message || "OpenAI request failed",
      });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return response.status(502).json({ error: "No text was returned by the model" });
    }

    return response.status(200).json({ text: outputText });
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}
