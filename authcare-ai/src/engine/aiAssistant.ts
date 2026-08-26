export interface JustificationResult {
  text: string;
  mode: "ai" | "local";
  note: string;
}

function localRewrite(input: string) {
  const compact = input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);

  if (!compact) return "";
  return /[.!?]$/.test(compact) ? compact : `${compact}.`;
}

export async function improveMedicalJustification(
  rawText: string,
  context: { diagnosis: string; service: string },
): Promise<JustificationResult> {
  const cleaned = rawText.trim();
  const sourceWarnings: string[] = [];
  if (cleaned && cleaned.split(/\s+/).length < 12) {
    sourceWarnings.push("Source note is very brief; confirm it contains the clinically relevant facts the physician intends to submit.");
  }
  if (!context.diagnosis.trim()) {
    sourceWarnings.push("Diagnosis / clinical motive is empty; ClaimBot will not infer one.");
  }
  if (!context.service.trim()) {
    sourceWarnings.push("Requested service is empty; ClaimBot will not infer one.");
  }
  const reviewNote = sourceWarnings.length ? ` ${sourceWarnings.join(" ")}` : "";

  if (!cleaned) {
    return {
      text: "",
      mode: "local",
      note: "Enter the physician's factual clinical justification first.",
    };
  }

  try {
    const response = await fetch("/api/improve-justification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleaned,
        diagnosis: context.diagnosis,
        service: context.service,
      }),
    });

    if (response.ok) {
      const body = (await response.json()) as { text?: string };
      if (body.text?.trim()) {
        return {
          text: body.text.trim(),
          mode: "ai",
          note: `Rewritten by the configured OpenAI endpoint. Review against the physician's source text before use.${reviewNote}`,
        };
      }
    }
  } catch {
    // Local development normally has no /api route. Fall through to safe local cleanup.
  }

  return {
    text: localRewrite(cleaned),
    mode: "local",
    note: `OpenAI endpoint not configured in this environment; ClaimBot used local formatting only and added no medical facts.${reviewNote}`,
  };
}

export interface PolicySummaryResult {
  text: string;
  mode: "ai" | "unavailable";
  note: string;
}

export async function summarizePolicyExcerpt(rawText: string): Promise<PolicySummaryResult> {
  const cleaned = rawText.trim();
  if (!cleaned) {
    return {
      text: "",
      mode: "unavailable",
      note: "Paste a policy or Table of Benefits excerpt first.",
    };
  }

  try {
    const response = await fetch("/api/summarize-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleaned }),
    });

    if (response.ok) {
      const body = (await response.json()) as { text?: string };
      if (body.text?.trim()) {
        return {
          text: body.text.trim(),
          mode: "ai",
          note: "Summarized only from the supplied excerpt. This is not a coverage or eligibility decision.",
        };
      }
    }
  } catch {
    // Local Vite development normally has no serverless /api endpoint.
  }

  return {
    text: "",
    mode: "unavailable",
    note: "Policy summarization needs the optional server-side OpenAI endpoint. The deterministic readiness engine works without it.",
  };
}
