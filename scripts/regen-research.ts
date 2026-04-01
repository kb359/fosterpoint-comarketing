/**
 * Re-generates research for specific projects using the improved prompts.
 * Run: npx ts-node --skip-project --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/regen-research.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateResearch } from "../src/lib/ai/research";

const prisma = new PrismaClient();

const TARGETS = [
  { nameContains: "Diligent", contactEmail: "ahmed@godiligent.ai", contactTitle: "Founder/CEO", contactName: "Ahmed Gaber", companyName: "Diligent AI", companyWebsite: "https://godiligent.ai" },
  { nameContains: "LeasePilot", contactEmail: "lkedmi@leasepilot.co", contactTitle: "Founder/CEO", contactName: "Lior Kedmi", companyName: "LeasePilot", companyWebsite: "https://leasepilot.co" },
  { nameContains: "Nia", contactEmail: "saif@niahealth.co", contactTitle: "Founder", contactName: "Saif", companyName: "Nia Health", companyWebsite: "https://niahealth.co" },
  { nameContains: "Vector", contactEmail: "andrew@vector.co", contactTitle: "Co-founder/CEO", contactName: "Andrew McGlathery", companyName: "Vector", companyWebsite: "https://vector.co" },
  { nameContains: "Alpaca", contactEmail: null, contactTitle: null, contactName: "Jeeun Lee", companyName: "AlpacaX", companyWebsite: null },
];

async function main() {
  for (const t of TARGETS) {
    const project = await prisma.project.findFirst({
      where: { companyName: { contains: t.nameContains } },
    });
    if (!project) { console.log(`Not found: ${t.nameContains}`); continue; }

    console.log(`\nRegenerating research for: ${t.companyName}...`);
    const research = await generateResearch({
      companyName: t.companyName,
      companyWebsite: t.companyWebsite,
      contactName: t.contactName,
      contactEmail: t.contactEmail,
      contactTitle: t.contactTitle,
      contactLinkedinUrl: null,
    });

    await prisma.research.deleteMany({ where: { projectId: project.id } });
    await prisma.research.createMany({
      data: [
        { projectId: project.id, type: "company_brief", content: research.companyBrief },
        { projectId: project.id, type: "person_brief", content: research.personBrief },
        { projectId: project.id, type: "call_questions", content: research.callQuestions },
      ],
    });
    console.log(`✓ ${t.companyName} research regenerated`);
    console.log("COMPANY:", research.companyBrief.slice(0, 200));
    console.log("PERSON:", research.personBrief.slice(0, 200));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
