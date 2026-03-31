import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const projects = [
  {
    companyName: "Bardo",
    companyWebsite: "https://bardo.se",
    companyDescription: "Swedish carbon accounting platform that uses lifecycle assessments (LCAs) to calculate actual carbon footprints from invoice line items, rather than cost-based estimates. Founded by Oscar (came from H2 Green Steel / Stegra) and Ingemar. ~15 person senior team based in Stockholm. Customers include companies across all industries who need accurate emissions reporting for EU regulatory compliance.",
    contactName: "Kasper Purunen",
    contactEmail: "kasper@bardo.se",
    contactTitle: "Engineer / Head of Security (unofficial)",
    posterName: "Oscar or Ingemar (founders)",
    callDate: new Date("2026-03-30T16:30:00.000Z"),
    stage: "call_complete" as const,
    firefliesId: "01KMTYSEVENGG5TER65Z1K39MR",
    summary: `Kasper Purunen, engineer at Bardo, handled the entire SOC 2 process himself in about two months (mid-September to November). He had prior experience doing due diligence at a previous 150-200 person company, which made the process easier at Bardo's smaller 15-person scale.

Key story points:
- Bardo does carbon accounting using lifecycle assessments rather than cost-based estimates, making their calculations far more accurate (e.g., an Apple phone would show lower footprint than average despite higher price)
- They handle sensitive financial data (all customer invoices and purchase data), including for public companies doing R&D -- a breach could expose competitive intelligence
- Customers were asking for SOC 2, not a hard requirement but "so much easier to just check that off instead of saying we're working on it"
- The team had already built with security in mind from day one since they knew compliance was coming
- Kasper was both managing and doing 95% of the work himself
- Post should come from Oscar or Ingemar (founders), NOT Kasper -- he's inactive on LinkedIn
- Kasper suggested CC'ing both founders (firstname@bardo.se) for review
- Need to get office address for gift shipping`,
    identifiedPoster: "Oscar or Ingemar (Bardo founders)",
  },
  {
    companyName: "Aetrex",
    companyWebsite: "https://atrix.ai",
    companyDescription: "AI-powered medical data analytics platform that helps pharmaceutical companies distill insights from clinical trials, medical education programs, and adverse event reporting. Turns complex clinical data (doctor's notes, trial results, PowerPoint presentations) into automated dashboards and reports. Previously, this manual process could take half a year per report. Team of ~12 (4 engineers, contractors, QA, infra, ops, CEO, marketing). CEO is Vera, was part of YC.",
    contactName: "Vitaliy Pankov",
    contactEmail: "vitaliy@atrix.ai",
    contactTitle: "Engineer",
    posterName: "Vitaliy Pankov (needs CEO Vera's approval)",
    callDate: new Date("2026-03-27T18:30:00.000Z"),
    stage: "call_complete" as const,
    firefliesId: "01KMK7KDHPTK0VMEDDZE1CAFQT",
    summary: `Vitaliy Pankov, engineer at Aetrex, discussed their compliance journey handling extremely sensitive patient and clinical trial data.

Key story points:
- Aetrex processes pharmaceutical/medical data -- a breach could literally end the company ("a single leak can lead to annihilation of the entire company")
- Both Vitaliy and CEO Vera handled compliance -- Vitaliy did implementation, Vera handled documentation and policy
- First time leading compliance, though Vitaliy had prior GDPR experience at a British startup working with NHS
- SOC 2 wasn't planned from day one but they knew it was coming; started when first deal locked in around 2024
- Pleasantly surprised by how thorough SOC 2 monitors are -- "you are not doing this just to get the check mark"
- They're also pursuing HIPAA (95% done) and exploring GDPR for European markets
- Found Oneleet through YC network referral
- Multi-layer security: VPN-only access, encrypted database at rest, even developers can't access parts without private key
- Post can come from Vitaliy's or CEO Vera's account -- needs Vera's approval either way
- Look at Vera's LinkedIn for voice/tone -- she's very active there
- Need office address in Warsaw, Poland for gift`,
    identifiedPoster: "Vitaliy Pankov or CEO Vera",
  },
  {
    companyName: "Capi AI (Scrapybara)",
    companyWebsite: "https://capi.ai",
    companyDescription: "Cloud-based coding agent platform (formerly Scrapybara, which provided virtual desktops for AI agents). Pivoted from infrastructure to product-level coding agents mid-2025. Founded by Haris Mehrzad and Justin, who met during a 2024 internship and went through YC. The platform runs coding agents in sandboxed cloud environments rather than locally, providing better security and parallelism.",
    contactName: "Haris Mehrzad",
    contactEmail: "haris@scrapybara.com",
    contactTitle: "Co-founder",
    contactLinkedinUrl: null,
    posterName: "Haris Mehrzad",
    callDate: new Date("2026-03-25T20:00:00.000Z"),
    stage: "call_complete" as const,
    firefliesId: "01KMBQYXZ9EH6RSH90CFKCE5YN",
    summary: `Haris Mehrzad, co-founder of Capi AI (formerly Scrapybara), discussed their unique SOC 2 journey that spanned 7-8 months due to rapid product evolution.

Key story points:
- Started SOC 2 when building infrastructure product (VMs for AI agents) where trust was critical
- "Ship of Theseus" situation -- the platform they started SOC 2 on didn't even exist by the end; every part was replaced during the process
- Pivoted from infra to coding agents mid-2025, completely changed stack multiple times during compliance
- Cloud-first security philosophy: sandboxed, ephemeral environments vs local agents that can access your entire file system
- First time going through SOC 2; co-founder's previous company (RunPod) took 1.5 years with Drata
- Interesting Delt connection: Delt was actually using Scrapybara's product for their own SOC 2 work before Scrapybara was compliant
- Chose Oneleet over Delt because talking to Brian felt "more personal, more chill, simpler, straightforward"
- Brian (not the founder) was in their Slack channel helping through every step
- Surprised by how fluid SOC 2 is -- can be as rigorous or simple as you want
- Post will come from Haris's account
- Has a blog on capi.ai website with a SOC 2 blog post
- Gift should go to apartment address (moving offices) -- shared in meeting chat
- Plaque should say "Capi" not "Scrapybara"`,
    identifiedPoster: "Haris Mehrzad",
  },
  {
    companyName: "Nixtla",
    companyWebsite: "https://nixtla.io",
    companyDescription: "Time series forecasting platform. Open source core (Nixtla package) plus paid products: Enterprise API (TimeGPT, hosted) and self-hosted deployment. Used by large enterprises to predict sales and other metrics. Microsoft-invested (M12), on Azure Foundry as TimeGen. ~11K LinkedIn followers on company account. CEO is Max. Currently rebranding with new website and agency.",
    contactName: "Carla Coll",
    contactEmail: "carla@nixtla.io",
    contactTitle: "Head of Growth",
    posterName: "Nixtla company account (11K followers)",
    callDate: new Date("2026-03-16T19:30:00.000Z"),
    stage: "call_complete" as const,
    firefliesId: "01KKQ4E6BDZJ2J53GRRV587H14",
    summary: `Carla Coll, Head of Growth at Nixtla, was not directly involved in the SOC 2 process (that was colleague Rogelio) but provided context on why compliance matters for their business.

Key story points:
- Nixtla handles sensitive enterprise data -- customers upload years of sales data for forecasting; the more data, the better predictions
- SOC 2 shifted from "nice to have" to "must have" as enterprise sales grew; some customers couldn't even use the 30-day trial because they couldn't send data through the API
- Data security comes up very early in sales conversations; SOC 2 specifically comes up mid-stage near procurement
- Moving toward self-hosted model but SOC 2 still important as trust signal regardless of hosting model
- Carla came from Upfluence (head of growth) -> YC startup (3 months, shut down) -> Nixtla via introduction to CEO Max
- Currently rebranding; content person left; Carla has been posting for 2 months
- Tone shifting from "scientific and perky" to "professional, talking to business leaders"
- Max posted the enterprise announcement in December -- good reference for voice
- Microsoft invested (M12), Azure partnership
- Post should come from company account (11K followers) unless Oneleet team prefers otherwise
- Rogelio is the technical compliance contact -- needs to be looped in for SOC 2 specifics
- Gift should go to Rogelio, not Carla ("he did the work, I should not take the gift")
- CC Rogelio for follow-up technical questions`,
    identifiedPoster: "Nixtla company account or Max (CEO)",
  },
  {
    companyName: "Carelane",
    companyWebsite: "https://carelane.io",
    companyDescription: "Clinical trial management and data platform operating across ~50 countries on all major continents. Works with pharmaceutical companies and research organizations to manage clinical trials. Handles extremely sensitive patient data requiring SOC 2, HIPAA, and GDPR compliance. Co-founder Yannick has 25 years of industry experience. Currently transitioning from word-of-mouth sales to active marketing campaigns.",
    contactName: "Lars Spies",
    contactEmail: "lars@carelane.io",
    contactTitle: "Operations / Marketing / Finance",
    posterName: "Yannick (CEO/Co-founder)",
    callDate: new Date("2026-03-16T17:45:00.000Z"),
    stage: "call_complete" as const,
    firefliesId: "01KKTVYYWB61P0XD9M9QA42JYE",
    summary: `Lars Spies, operations lead at Carelane, provided context on the company but was not deeply involved in the SOC 2 technical process (that was Yannick and Amanda).

Key story points:
- Carelane operates in ~50 countries across all continents, managing clinical trials for pharma companies
- Patient data is extremely sensitive -- compliance is absolutely required, not optional
- Larger pharma companies and CROs won't even consider working with you without SOC 2
- They go "way, way, way beyond" requirements of SOC 2 and HIPAA
- EU regulations organized at EU level, simplifying multi-country compliance
- Co-founder Yannick has 25 years industry experience, built client base through personal network
- Currently launching first marketing campaigns; security will be a major part of messaging
- SOC 2 was driven by necessity -- learned quickly it was required to do business with larger clients
- Lars joined ~7-8 months ago, SOC 2/Oneleet was already in place
- He couldn't speak to vendor selection, technical details, or operational changes from SOC 2
- Need follow-up with Yannick for: vendor selection, technical security measures, internal process changes
- Also need Amanda (head of quality) for renewal process details
- Post should come from Yannick's account -- "professional, yet not boring" tone; conservative field so err professional
- Lars wrote recent LinkedIn posts for Yannick; not much personal voice to reference
- Planning to ramp LinkedIn presence as part of new marketing push`,
    identifiedPoster: "Yannick (CEO/Co-founder)",
  },
];

async function main() {
  for (const p of projects) {
    console.log(`Creating project: ${p.companyName}...`);

    const project = await prisma.project.create({
      data: {
        companyName: p.companyName,
        companyWebsite: p.companyWebsite,
        companyDescription: p.companyDescription,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        contactTitle: p.contactTitle,
        posterName: p.posterName,
        callDate: p.callDate,
        stage: p.stage,
      },
    });

    console.log(`  Project created: ${project.id}`);

    // Create transcript record
    await prisma.transcript.create({
      data: {
        projectId: project.id,
        firefliesMeetingId: p.firefliesId,
        rawTranscript: `[Full transcript available in Fireflies: https://app.fireflies.ai/view/${p.firefliesId}]`,
        callSummary: p.summary,
        identifiedPoster: p.identifiedPoster,
      },
    });

    console.log(`  Transcript created`);

    // Create activity log
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        action: "Project created from Fireflies transcript",
        details: `Ingested from meeting on ${p.callDate.toISOString().split("T")[0]}`,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        action: "Stage changed to call_complete",
        details: "Transcript imported and summarized",
      },
    });

    console.log(`  Activity logs created`);
  }

  console.log("\nDone! All 5 projects seeded.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
