import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export interface GiftIdea {
  title: string;
  description: string;
  why: string;
  where: string;
  estimatedCost: string;
  customization: string;
}

export async function generateGiftIdeas(input: {
  companyName: string;
  companyBrief: string;
  personBrief: string;
  contactName: string;
  contactTitle: string | null;
}): Promise<GiftIdea[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are helping choose a thoughtful, personalized gift for a co-marketing partner who just agreed to do a compliance story with Oneleet.

COMPANY: ${input.companyName}
COMPANY BRIEF: ${input.companyBrief}

CONTACT: ${input.contactName}${input.contactTitle ? ` (${input.contactTitle})` : ""}
PERSON BRIEF: ${input.personBrief}

Generate 3 creative gift ideas. Each gift should:
- Be relevant to their company, industry, or the person's background/interests
- Be customizable in some way (engraved, branded, personalized message)
- Be something a startup founder/engineer would actually appreciate (not generic)
- Be practical to ship internationally if needed
- Cost $50-$200

Format your response as JSON array:
[
  {
    "title": "Gift name",
    "description": "What it is in 1-2 sentences",
    "why": "Why this is specifically perfect for them/their company",
    "where": "Where to order it (specific website or service)",
    "estimatedCost": "$75-$100",
    "customization": "How to customize it (e.g., engrave with company name, add custom message)"
  }
]

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text = (message.content[0] as { text: string }).text.trim();
  try {
    const ideas = JSON.parse(text);
    return Array.isArray(ideas) ? ideas : [];
  } catch {
    return [];
  }
}
