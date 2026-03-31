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
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Research and write a 2-3 paragraph brief about the company "${project.companyName}"${project.companyWebsite ? ` (website: ${project.companyWebsite})` : ""}.

Cover:
- What the company does and their core product/service
- Industry, stage, and approximate team size if findable
- Any relevance to compliance, security, or SOC 2 (this is for a co-marketing post with Oneleet, a compliance automation company)
- Recent news or notable developments

Write in a concise, factual tone. This brief will be used to prepare for a story call with someone from this company.`,
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
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Write a brief about ${project.contactName}${project.contactTitle ? `, ${project.contactTitle}` : ""}${project.contactLinkedinUrl ? ` (LinkedIn: ${project.contactLinkedinUrl})` : ""}.

Based on what you can infer from their name, title, and any public information:
- Their likely role and responsibilities
- Background and experience relevant to compliance/security decisions
- Communication style hints based on their title/seniority level

This brief will be used to prepare for a 10-minute story call about their compliance journey. Keep it concise and actionable.`,
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
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are preparing questions for a 10-minute story call with ${project.contactName}${project.contactTitle ? `, ${project.contactTitle}` : ""} at ${project.companyName}.

Context:
${companyBrief}

${personBrief}

The goal of this call is to gather raw material for a LinkedIn post that will be ghostwritten in this person's voice. We need personal stories, specific moments, and emotional reactions -- not marketing metrics.

Generate 8-12 questions. Focus on:
- Their compliance journey -- what triggered it, what they expected vs reality
- Specific frustrations with compliance before Oneleet
- A moment that surprised them or changed their mind
- How they'd explain the experience to a founder friend over coffee
- What they'd tell their past self about going through this

Do NOT ask generic marketing questions like "what ROI did you see" or "would you recommend Oneleet."

Format as a numbered list.`,
      },
    ],
  });

  return (message.content[0] as { text: string }).text;
}
