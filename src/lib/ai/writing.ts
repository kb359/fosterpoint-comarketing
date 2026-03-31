import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function analyzeWriting(
  samples: string[],
  subjectName: string
): Promise<string> {
  const samplesText = samples
    .map((s, i) => `--- Sample ${i + 1} ---\n${s}`)
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Analyze the following writing samples from ${subjectName} for the purpose of ghostwriting a LinkedIn post in their voice.

${samplesText}

Produce a detailed style guide covering:
- Sentence length and structure patterns
- Vocabulary level and typical word choices
- Tone: formal vs casual, confident vs humble, earnest vs sarcastic
- How they typically open posts (hooks)
- How they close posts (do they end abruptly? with a CTA? with a question?)
- Paragraph length and formatting habits
- Use of humor, vulnerability, self-deprecation
- Recurring phrases, verbal tics, favorite words
- Things they NEVER do (this is critical for avoiding ghostwriting tells)
- Use of emojis, lists, hashtags
- Overall energy and personality that comes through

Be specific. Use examples from the samples.`,
      },
    ],
  });

  return (message.content[0] as { text: string }).text;
}
