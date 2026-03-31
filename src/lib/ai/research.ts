import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function generateResearch(project: {
  companyName: string;
  companyWebsite: string | null;
  contactName: string;
  contactEmail: string | null;
  contactTitle: string | null;
  contactLinkedinUrl: string | null;
}): Promise<{ companyBrief: string; personBrief: string; callQuestions: string }> {
  const [companyBrief, personBrief] = await Promise.all([
    generateCompanyBrief(project),
    generatePersonBrief(project),
  ]);

  const callQuestions = await generateCallQuestions(project, companyBrief, personBrief);

  return { companyBrief, personBrief, callQuestions };
}

async function generateCompanyBrief(project: {
  companyName: string;
  companyWebsite: string | null;
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Write a 2-4 sentence company brief for "${project.companyName}"${project.companyWebsite ? ` (${project.companyWebsite})` : ""}.

Rules:
- Maximum 4 sentences total. No headers. No bullet points. Just dense, factual prose.
- Describe what they build and who they sell to in sentence 1-2.
- Include funding, notable investors, or key metrics in sentence 3 if known.
- Note any compliance/security relevance (SOC 2, HIPAA, healthcare, fintech, enterprise data) in the last sentence.
- Use only facts you are confident about. If uncertain, describe the product/market without specific claims.
- Do NOT start with "I was unable to find..." — always provide something based on what you know.`,
      },
    ],
  });

  return (message.content[0] as { text: string }).text;
}

async function generatePersonBrief(project: {
  contactName: string;
  contactEmail: string | null;
  contactTitle: string | null;
  contactLinkedinUrl: string | null;
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Write a 3-5 sentence person brief for ${project.contactName}${project.contactTitle ? ` (${project.contactTitle})` : ""}${project.contactLinkedinUrl ? ` — LinkedIn: ${project.contactLinkedinUrl}` : ""}${project.contactEmail ? ` — email: ${project.contactEmail}` : ""}.

Format: Plain prose, no headers, no bullet points. Include:
- Sentence 1: Current role and company, approximate location if known, any notable details (e.g. YC, raised funding, prior big co).
- Sentence 2-3: Previous roles or companies — be specific with employer names and what they did there.
- Sentence 4: Education or certifications if known.
- Sentence 5: Any public presence — blog, talks, notable content they've published.

Use only facts you are confident about from your training data. Be specific. If you genuinely know nothing about this person, write a 2-sentence inference from their title and email domain only — do NOT write a generic placeholder.`,
      },
    ],
  });

  return (message.content[0] as { text: string }).text;
}

async function generateCallQuestions(
  project: { companyName: string; contactName: string; contactTitle: string | null },
  companyBrief: string,
  personBrief: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `Write 6-8 call prep questions for ${project.contactName}${project.contactTitle ? ` (${project.contactTitle})` : ""} at ${project.companyName}.

COMPANY CONTEXT:
${companyBrief}

PERSON CONTEXT:
${personBrief}

Rules:
- 6-8 questions max. Numbered list. No sub-bullets.
- First 4 questions are general compliance journey questions (same skeleton as below, adapted to their company/data type):
  1. When did SOC 2 go from "someday" to "we need this now" — was there a specific deal, customer, or partner?
  2. What did you believe about SOC 2 before starting that turned out to be wrong?
  3. What does security actually mean for ${project.companyName} and the [describe their customers/data] who trust you?
  4. How did you choose Oneleet?
- Last 2-4 questions are SPECIFIC to this person's background and company. Reference actual details from the company and person briefs. Make them feel like you've done your homework — mention specific prior employers, specific products, specific markets. These should be impossible to ask a random person.
- No generic questions like "what ROI did you see" or "would you recommend Oneleet."
- Keep each question to one sentence.`,
      },
    ],
  });

  return (message.content[0] as { text: string }).text;
}
