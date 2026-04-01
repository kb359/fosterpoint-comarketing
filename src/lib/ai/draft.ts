import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuid } from "uuid";

const anthropic = new Anthropic();

export async function generateDraft(input: {
  companyBrief: string;
  personBrief: string;
  callSummary: string;
  writingAnalysis: string;
  posterName: string;
  posterTitle: string;
  companyName: string;
  guidance?: string;
}): Promise<{
  content: string;
  hookOptions: Array<{ id: string; text: string }>;
  quoteOptions: Array<{ id: string; text: string; context: string }>;
}> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are ghostwriting a LinkedIn post for ${input.posterName}, ${input.posterTitle} at ${input.companyName}. The post is about their experience getting SOC 2 compliant with Oneleet.

VOICE GUIDE:
${input.writingAnalysis}

SOURCE MATERIAL (from story call):
${input.callSummary}

COMPANY CONTEXT:
${input.companyBrief}

PERSON CONTEXT:
${input.personBrief}

${input.guidance ? `ADDITIONAL GUIDANCE:\n${input.guidance}\n` : ""}

REFERENCE EXAMPLES OF GREAT ONELEET-ADJACENT LINKEDIN POSTS (study the tone, structure, and energy -- these are the gold standard):

Example 1 (Erik Vogelzang, Oneleet co-founder, storytelling style):
"Funny story of our first ever outbound sales call. We were absolutely terrified but knew we had to do it at some point. For weeks, we were taunting each other: 'You coward. You total coward.' 'You do it. You pick up the phone.' ... We all went red. It felt terrible. We were all like: 'Never again. Never outbound again.' But Bryan was like: 'Hold up.' ..."

Example 2 (Bryan Onel, Oneleet CEO, direct and empathetic):
"A lot of founders are reaching out asking what they should do. Before I get into the advice, let me just say - I feel genuinely sad about this. Most of these founders weren't trying to cut corners. They went to a company that told them it would handle their compliance. Some of them paid $20,000. For an early stage startup, that's a huge chunk of cash. And they got scammed..."

Example 3 (Erik, casual milestone post):
"We served more than 1,000 companies last year. Two years ago, our 'office' was Brian's parents' attic and a couch. Our first offsite was in his living room (someone's mom brought snacks). I didn't even have a desk for the first year, I worked off that couch until we hit $5M ARR. My posture still hasn't recovered..."

Notice the patterns in these: short punchy lines. Conversational. Humor and vulnerability mixed in. No corporate jargon. Real stories with specific details. The Oneleet mention is WOVEN IN, never the focus.

RULES:
- Write in ${input.posterName}'s voice. Match their style exactly from the voice guide above.
- Post should read like a founder venting to a friend, not marketing copy.
- Mention Oneleet exactly ONCE, woven naturally into the story. Not foregrounded as an ad.
- No em dashes. Ever.
- No cliches: "one thing became clear," "that part mattered to us," "wasn't an X, it was Y," "here's what I learned," "here's the thing"
- No AI-sounding polish. Keep it raw and real. If it sounds like ChatGPT wrote it, start over.
- 150-300 words total per post.
- Speed/timeline claims must be framed as byproduct of expertise, not corner-cutting.
- Don't close with a dramatic closer. Match how this person actually ends posts. Can be abrupt.
- Short punchy sentences preferred. One-line paragraphs are good.
- Include a specific anecdote or moment from the call -- something only this person would say.
- The post is NOT about Oneleet. It's about the founder's experience, their company's journey, the pain of compliance, the reality of handling sensitive data. Oneleet is just the tool that happened to help.

HOOKS — write 3 different opening lines/paragraphs. Rules for hooks:
- NEVER mention SOC 2 in any hook. Not even obliquely ("compliance," "audit," "certification" are all off-limits in the hook).
- Each hook takes a completely different angle: one personal/emotional, one story/scene, one contrarian or unexpected statement.
- The hook should make someone stop scrolling because it's interesting, not because it's about a product.
- 1-3 lines max per hook.

Generate the full post 3 times, each version starting with a different hook but sharing the same body/story after the hook.

Format your response EXACTLY like this:

## HOOK VARIANT 1
[Full post — hook 1 + shared body]

## HOOK VARIANT 2
[Full post — hook 2 + shared body]

## HOOK VARIANT 3
[Full post — hook 3 + shared body]

## QUOTE 1: Pain/Problem
[quote text]
Context: [brief context about what this quote refers to]

## QUOTE 2: Experience
[quote text]
Context: [brief context]

## QUOTE 3: Outcome
[quote text]
Context: [brief context]`,
      },
    ],
  });

  const text = (message.content[0] as { text: string }).text;

  // Parse the 3 hook variants
  const hookVariants: Array<{ id: string; text: string }> = [];
  for (let i = 1; i <= 3; i++) {
    const regex = new RegExp(
      `## HOOK VARIANT ${i}\\n([\\s\\S]*?)(?=## HOOK VARIANT ${i + 1}|## QUOTE 1|$)`
    );
    const match = text.match(regex);
    if (match) {
      hookVariants.push({ id: uuid(), text: match[1].trim() });
    }
  }

  // Default content = first hook variant
  const content = hookVariants[0]?.text ?? text;

  // Parse quotes
  const quoteOptions = [];
  for (let i = 1; i <= 3; i++) {
    const label = i === 1 ? "Pain/Problem" : i === 2 ? "Experience" : "Outcome";
    const regex = new RegExp(
      `## QUOTE ${i}: ${label}\\n([\\s\\S]*?)(?=## QUOTE ${i + 1}|$)`
    );
    const match = text.match(regex);
    if (match) {
      const quoteText = match[1].trim();
      const contextMatch = quoteText.match(/Context: (.+)/);
      const cleanText = quoteText.replace(/Context: .+/, "").trim();
      quoteOptions.push({
        id: uuid(),
        text: cleanText,
        context: contextMatch ? contextMatch[1] : label,
      });
    }
  }

  while (quoteOptions.length < 3) {
    quoteOptions.push({ id: uuid(), text: "Quote not generated", context: "Please regenerate" });
  }

  return { content, hookOptions: hookVariants, quoteOptions };
}
