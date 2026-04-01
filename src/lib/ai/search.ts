import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

/**
 * Uses Claude with web search to find a person's LinkedIn profile URL.
 * Returns null if not found or if web search is unavailable.
 */
export async function findLinkedInUrl(
  name: string,
  company: string
): Promise<string | null> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      messages: [
        {
          role: "user",
          content: `Find the LinkedIn profile URL for a person named "${name}" who is a founder or executive at "${company}".

Try multiple searches if needed:
- site:linkedin.com/in "${name}" "${company}"
- "${name}" "${company}" founder linkedin
- "${company}" founder site:linkedin.com

Return ONLY the LinkedIn URL in format https://linkedin.com/in/username. If you find multiple candidates, pick the most likely match. If truly not found after trying, return "not_found".`,
        },
      ],
    });

    // Look through all text blocks for a LinkedIn URL
    for (const block of message.content) {
      if (block.type === "text") {
        const match = block.text.match(
          /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%-]+\/?/i
        );
        if (match) {
          return match[0].replace(/\/$/, "");
        }
      }
    }
    return null;
  } catch (err) {
    console.error("LinkedIn URL search error:", err);
    return null;
  }
}
