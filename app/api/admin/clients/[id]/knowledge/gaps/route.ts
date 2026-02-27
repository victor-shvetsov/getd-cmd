import { generateText } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { SECTION_SCHEMAS } from "@/lib/schema";
import { aiModel, getClientAIContext } from "@/lib/ai-config";

/**
 * GET — analyze what info we still need for this client.
 * Returns a structured gap analysis with suggested questions.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const supabase = createAdminClient();

  const ctx = await getClientAIContext(supabase, id);

  // Build a list of what data each tab needs
  const tabRequirements = Object.entries(SECTION_SCHEMAS).map(([key, schema]) => ({
    tab: schema.label,
    key,
    blocks: schema.blocks.map((b) => ({
      title: b.title,
      fields: b.fields,
    })),
  }));

  const prompt = `You are an experienced business consultant preparing questions for a call with a business owner or decision-maker. Your job is to extract maximum useful information using questions they can NATURALLY answer — about their business, their customers, and their goals.

CRITICAL RULES FOR QUESTION STYLE:
- You are talking to a BUSINESS OWNER, not a marketer. They don't know what "ICP" means, what "CPC" is, or what "content assets" are.
- NEVER ask about marketing strategy, channels, budgets, or technical marketing concepts.
- NEVER ask "What are your KPIs?" or "What's your marketing budget?" or "What content can be leveraged?"
- Instead ask about their BUSINESS: who comes to them, why, what problems they solve, what makes them different, what they're proud of.
- Questions should feel like a friendly conversation, not a form or an audit.
- Each question should be something the business owner would ENJOY answering — about their craft, their customers, their story.

GOOD QUESTIONS (examples):
- "Tell me about a typical customer — who walks through your door and what brought them to you?"
- "What's the #1 thing your happy customers say about you?"
- "What do most people get wrong about your industry before they find you?"
- "If someone is choosing between you and a competitor, what usually tips the decision?"
- "What's the most common question people ask before they book?"
- "Where do most of your current customers find you?"
- "What service are you most proud of, and why?"
- "What's the typical process from first contact to completed service?"
- "Is there a type of customer you'd love to get more of?"
- "What areas or neighborhoods do most of your customers come from?"

BAD QUESTIONS (never generate these):
- "What is your ideal customer profile?" (too technical)
- "What marketing channels have you used?" (they don't think in channels)
- "What content assets do you have?" (meaningless to them)
- "What's your monthly marketing budget?" (too direct, too financial)
- "What specific features do you want in a website redesign?" (they don't know)
- "What is your customer acquisition cost?" (jargon)

${ctx.promptBlock}

## INTERNAL DATA WE NEED TO FILL (do NOT expose this structure to the client — this is for YOUR understanding only):
${JSON.stringify(tabRequirements, null, 2)}

## YOUR TASK:
1. Look at what we know vs what we need internally.
2. Generate business-owner-friendly questions that will indirectly give us the data we need.
3. The owner's answers will be interpreted by US later — they don't need to answer in any specific format.

Return a JSON object:

{
  "overall_readiness": 0-100,
  "tabs": [
    {
      "tab": "tab label",
      "readiness": 0-100,
      "status": "ready" | "partial" | "empty",
      "missing": ["brief internal note about what data we still need — for admin eyes only"],
      "questions": ["business-friendly question that will help us fill this gap"]
    }
  ],
  "priority_questions": [
    "The top 5-7 most valuable questions for the next conversation, ordered by how much they unlock. These should be conversational, warm, and easy for ANY business owner to answer."
  ],
  "next_call_agenda": "A 2-3 sentence suggested conversation flow — what to open with, what to dig into, how to close. Written as a note to the account manager, not the client."
}

RULES:
1. Return ONLY valid JSON — no markdown, no code fences.
2. Priority questions should unlock information across MULTIPLE internal tabs with a single natural answer.
3. If we know almost nothing, start with the basics: what does the business do, who are their customers, what makes them special.
4. If we know a lot already, ask deeper questions: competitive advantages, customer objections, seasonal patterns, success stories.
5. NEVER exceed 7 priority questions — quality over quantity.
6. The "missing" field in each tab is for the admin/strategist — it CAN use marketing terminology. Only "questions" and "priority_questions" must be business-owner-friendly.`;

  try {
    const result = await generateText({
      model: aiModel("primary"),
      prompt,
      maxOutputTokens: 3000,
    });

    let gaps: Record<string, unknown>;
    try {
      gaps = JSON.parse(result.text);
    } catch {
      const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        gaps = JSON.parse(match[1].trim());
      } else {
        return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
      }
    }

    return NextResponse.json(gaps);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Gap analysis failed: ${errMsg}` }, { status: 500 });
  }
}
