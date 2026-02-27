import { generateText } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { aiModel, getClientAIContext } from "@/lib/ai-config";

const ROLE_PROMPTS: Record<string, string> = {
  designer: `You are helping a marketing agency owner create a brief for their GRAPHIC DESIGNER who needs to design a logo and brand identity for a new client.

Create a comprehensive Designer Brief in Markdown format with these sections:

## Client Overview
- Who the client is, what industry, what they do

## Target Audience
- Who the client's customers are (demographics, psychographics)
- What matters to them visually

## Brand Personality & Tone
- How the brand should feel (modern, traditional, playful, serious, premium, approachable...)
- Adjectives that describe the desired brand personality

## Visual Direction
- Color preferences or restrictions (if mentioned)
- Style references (if mentioned)
- Competitors to differentiate from

## Logo Requirements
- Deliverables needed: primary logo, icon-only, white version, dark version
- Where logo will be used: website, business cards, vehicle wraps, merchandise, signage
- File formats needed: SVG, PNG (transparent), PDF

## Brand Collateral Needed
- Business cards, letterheads, social media templates, etc.

## Key Details to Incorporate
- Any specific imagery, symbols, or elements the client mentioned

Keep it practical and actionable. If info is missing, note it as "TBD - ask client".`,

  photographer: `You are helping a marketing agency owner create a shot list brief for a PHOTOGRAPHER who will shoot content for a client's new website and marketing materials.

Create a comprehensive Photographer Shot List in Markdown format with these sections:

## Project Overview
- Client name, industry, what the photos are for

## Brand Mood
- Desired feeling/style of photos (light & airy, dark & moody, vibrant, professional, casual)
- Reference to brand colors if available

## Required Shots

### Team / People Photos
- Headshots, team photos, action shots of staff working
- Wardrobe guidance based on brand

### Product / Service Photos
- What products or services need to be photographed
- Specific angles or compositions

### Lifestyle / Environment
- Workspace, storefront, location shots
- Customer-facing environments

### Detail / Texture Shots
- Close-ups for backgrounds, hero sections, etc.

## Technical Requirements
- Resolution (web: 2000px+ wide)
- Orientation (mix of landscape for hero sections, portrait for team, square for social)
- Editing style preferences

## Locations & Scheduling Notes
- Where the shoot should happen
- Any timing considerations

If info is missing, note it as "TBD - arrange with client".`,

  developer: `You are helping a marketing agency owner create a technical spec sheet for a WEB DEVELOPER who will build a client's website based on approved designs.

Create a comprehensive Developer Spec Sheet in Markdown format with these sections:

## Project Overview
- Client name, industry, website purpose

## Technical Stack
- Recommended framework/CMS based on client needs
- Hosting requirements

## Site Structure
- Pages needed with URL paths
- Navigation structure

## Functionality Requirements
- Contact forms, booking systems, e-commerce, etc.
- Integrations needed (Google Analytics, CRM, email marketing, etc.)

## SEO Requirements
- Target keywords (from demand analysis if available)
- Meta title/description patterns
- Schema markup needed
- Sitemap & robots.txt requirements

## Performance Requirements
- Core Web Vitals targets
- Image optimization approach
- Caching strategy

## Content Management
- What the client needs to update themselves
- CMS requirements

## Third-Party Integrations
- Google Business Profile
- Social media links
- Analytics & tracking pixels
- Any APIs

## Launch Checklist
- SSL, redirects, 404 handling, analytics setup, search console, etc.

If info is missing, note it as "TBD - confirm before development".`,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;
  const { role } = await request.json();

  if (!role || !ROLE_PROMPTS[role]) {
    return NextResponse.json(
      { error: "Invalid role. Use: designer, photographer, developer" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const ctx = await getClientAIContext(supabase, clientId);

  if (!ctx.facts.length) {
    return NextResponse.json(
      { error: "No processed knowledge entries found. Add some info to the Knowledge Bank first." },
      { status: 400 }
    );
  }

  const systemPrompt = ROLE_PROMPTS[role];

  const userPrompt = `Client: ${ctx.name}

${ctx.promptBlock}

Based on all of this information, generate the brief. Be specific and use actual details from the knowledge bank. Everything should serve the project objective above. Don't be generic.`;

  try {
    const result = await generateText({
      model: aiModel("primary"),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 3000,
    });

    const brief = {
      content: result.text,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(brief);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Brief generation error:", errMsg);
    return NextResponse.json(
      { error: `Brief generation failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
