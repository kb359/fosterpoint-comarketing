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
  quoteOptions: Array<{ id: string; text: string; context: string }>;
}> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
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
- Write in ${input.posterName}'s voice. Match their style exactly.
- Post should read like a founder venting to a friend, not marketing copy.
- Mention Oneleet exactly ONCE, woven naturally into the story. Not foregrounded as an ad.
- No em dashes. Ever.
- No cliches: "one thing became clear," "that part mattered to us," "wasn't an X, it was Y," "here's what I learned," "here's the thing"
- No AI-sounding polish. Keep it raw and real. If it sounds like ChatGPT wrote it, start over.
- 150-300 words.
- Speed/timeline claims must be framed as byproduct of expertise, not corner-cutting.
- Open with a STRONG hook that makes someone stop scrolling. Not "I recently got SOC 2 compliant." Something unexpected or personal.
- Don't close with a dramatic closer. Match how this person actually ends posts. Can be abrupt.
- Short punchy sentences preferred. One-line paragraphs are good.
- Include a specific anecdote or moment from the call -- something only this person would say.
- The post is NOT about Oneleet. It's about the founder's experience, their company's journey, the pain of compliance, the reality of handling sensitive data. Oneleet is just the tool that happened to help.

Also generate 3 quote options for a backlink on Oneleet's website:
1. One about the problem/pain before compliance
2. One about the experience working with Oneleet specifically
3. One about the outcome/result

Each quote should be 1-2 sentences, sound natural (not polished), and be something this person would actually say based on the call transcript.

Format your response as:

## POST
[the full LinkedIn post]

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

  const postMatch = text.match(/## POST\n([\s\S]*?)(?=## QUOTE 1)/);
  const content = postMatch ? postMatch[1].trim() : text;

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

  // Ensure we always have 3 options
  while (quoteOptions.length < 3) {
    quoteOptions.push({
      id: uuid(),
      text: "Quote not generated",
      context: "Please regenerate",
    });
  }

  return { content, quoteOptions };
}
