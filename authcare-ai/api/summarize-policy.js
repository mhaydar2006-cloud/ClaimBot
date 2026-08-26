export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return response.status(503).json({ error: "OPENAI_API_KEY is not configured" });
  }

  const { text } = request.body ?? {};
  if (typeof text !== "string" || !text.trim()) {
    return response.status(400).json({ error: "Policy or Table of Benefits text is required" });
  }

  // Keep this feature intentionally extractive/conservative: it summarizes only what the user pasted.
  const input = [
    "Summarize the following health-insurance policy/Table of Benefits excerpt for a healthcare administrative user.",
    "Hard rules:",
    "- Use only facts explicitly stated in the pasted text.",
    "- Do not infer whether this patient is covered, eligible, approved, in-network, or medically necessary.",
    "- Do not invent limits, exclusions, copays, waiting periods, authorizations, or benefit amounts.",
    "- If a detail is ambiguous or absent, say that it is not stated in the supplied excerpt.",
    "- Prefer concise bullets under: Explicit benefits, Limits/cost-sharing, Pre-authorization language, Exclusions/conditions, Unclear/not stated.",
    "- This is a summary, not a coverage decision.",
    `Policy excerpt:\n${text.trim().slice(0, 18000)}`,
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
        max_output_tokens: 900,
        input,
      }),
    });

    const payload = await openAIResponse.json();
    if (!openAIResponse.ok) {
      return response.status(openAIResponse.status).json({ error: payload?.error?.message || "OpenAI request failed" });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) return response.status(502).json({ error: "No text was returned by the model" });
    return response.status(200).json({ text: outputText });
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : "Unexpected server error" });
  }
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}
