import Anthropic from "@anthropic-ai/sdk";

export interface ParsedLead {
  from_name: string;
  from_email: string;
  subject: string;
  message: string;
}

/**
 * Use Claude Haiku to extract structured lead data from a raw contact form email.
 * If an example email is provided, it's used as a reference so Claude understands
 * the specific format of that client's contact form notifications.
 */
export async function parseLeadEmail(
  rawEmail: string,
  example?: string
): Promise<ParsedLead> {
  const client = new Anthropic();

  const exampleSection = example
    ? `Here is an example email from this client's contact form, so you know the format:\n\n---\n${example}\n---\n\n`
    : "";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system:
      `You are an email parser. Extract structured contact information from contact form notification emails.\n\n` +
      exampleSection +
      `Return ONLY a valid JSON object with exactly these fields:\n` +
      `{\n` +
      `  "from_name": "the sender's full name, or empty string if unknown",\n` +
      `  "from_email": "the sender's email address",\n` +
      `  "subject": "subject of their inquiry, or empty string",\n` +
      `  "message": "their actual message or question"\n` +
      `}\n\n` +
      `If you cannot find a field, use an empty string. Never return anything except the JSON object.`,
    messages: [
      {
        role: "user",
        content: `Parse this email:\n\n${rawEmail}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  // Strip markdown code fences if Claude wraps in ```json ... ```
  const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  let parsed: ParsedLead;
  try {
    parsed = JSON.parse(json) as ParsedLead;
  } catch {
    throw new Error(`Email parser returned invalid JSON. Raw response: ${text.slice(0, 200)}`);
  }

  // Ensure required field is present
  if (!parsed.from_email) {
    throw new Error(`Email parser could not extract sender email. Raw response: ${text.slice(0, 200)}`);
  }

  return parsed;
}
