import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function summarizeTranscript(
  transcript: string,
  companyName: string,
  contactName: string
): Promise<{ summary: string; identifiedPoster: string }> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Analyze this transcript from a story call with someone from ${companyName}. The main contact is ${contactName}.

TRANSCRIPT:
${transcript}

Provide:

1. **SUMMARY** (3-5 paragraphs): Key stories and themes from the call. Focus on:
   - Their compliance journey and what triggered it
   - Specific pain points and frustrations
   - Memorable moments or quotes
   - Their experience with Oneleet specifically
   - Outcomes and how they feel about it now

2. **IDENTIFIED POSTER**: Based on the conversation, who should be the person posting on LinkedIn? Consider:
   - Who had the strongest personal story
   - Who is most senior / has the most LinkedIn presence
   - Who expressed the most authentic emotions about the experience

   Just provide the person's name.

Format your response as:

## Summary
[summary content]

## Identified Poster
[person's name]`,
      },
    ],
  });

  const text = (message.content[0] as { text: string }).text;

  const summaryMatch = text.match(/## Summary\n([\s\S]*?)(?=## Identified Poster)/);
  const posterMatch = text.match(/## Identified Poster\n(.+)/);

  return {
    summary: summaryMatch ? summaryMatch[1].trim() : text,
    identifiedPoster: posterMatch ? posterMatch[1].trim() : contactName,
  };
}
