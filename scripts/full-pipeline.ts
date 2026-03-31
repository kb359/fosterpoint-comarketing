/**
 * Full sync + AI pipeline script
 * - Upserts all known co-marketing projects
 * - Saves Fireflies transcripts
 * - Runs research, transcript summary, writing analysis, draft generation
 * - Adds missing projects (Nia Health, Vector, Diligent, LeasePilot)
 *
 * Run: npx ts-node --skip-project scripts/full-pipeline.ts
 */

import { PrismaClient } from "@prisma/client";
import { generateResearch } from "../src/lib/ai/research";
import { summarizeTranscript } from "../src/lib/ai/transcript";
import { analyzeWriting } from "../src/lib/ai/writing";
import { generateDraft } from "../src/lib/ai/draft";

const prisma = new PrismaClient();

// ─── Transcript content from Fireflies ───────────────────────────────────────

const TRANSCRIPTS: Record<string, { raw: string; summary: string }> = {
  bardo: {
    raw: `Kevin Baker: Hey, Casper.
Kasper Purunen: Hey, man. Sorry, totally forgot. I usually don't take meetings this late.
Kevin Baker: I know, I know. Okay so I'm working with Oneleet to help tell customer compliance stories. Is this post coming from your account or one of the founders?
Kasper Purunen: Not my account for sure because I'm very inactive on LinkedIn. Probably some of the founders -- Oscar or Ingemar -- they're the ones driving most of the traffic on LinkedIn.
Kevin Baker: Were you spearheading the compliance process?
Kasper Purunen: Yeah, I was basically doing the whole thing. I started in mid September and we were done in November. So maybe like two months. I've done similar processes before -- at my previous job I was engineering manager and head of platform at a 150-200 person company doing due diligence for a sale. But I hadn't done SOC 2 specifically.
Kevin Baker: What surprised you about the process?
Kasper Purunen: It was actually easier than I thought. Being a company of 15 people where everything is greenfield, you can write the policies and enforce them at the same time. You don't have to move the culture of 200 people.
Kevin Baker: Did going through compliance change how you were building or make you more secure?
Kasper Purunen: There are some sobering things. But to be honest, a lot of these things were things we'd already thought about even before SOC 2 because we knew we were going to need it. We had spoken from day one that customers are going to ask for this. It's a pretty senior team so we were in pretty good shape already. Sure there were things we had to make better.
Kevin Baker: What does a breach look like with what you guys do?
Kasper Purunen: Bardo does carbon accounting using lifecycle assessments rather than cost-based estimates. We collect LCAs and do actual calculations on the items you've bought. So we have access to all your financial data -- all the stuff you've been buying -- especially if you're a listed public company doing R&D for a new product and someone knows exactly what you've been buying. In some cases a breach would be pretty detrimental.
Kevin Baker: Did customers force you to get SOC 2?
Kasper Purunen: No forcing function, but customers were asking for it. We hadn't lost any deals because we didn't have it, but it's so much easier to just check that off instead of saying we're working on it. Just having it -- you can drop the conversation.
Kevin Baker: How did you choose Oneleet?
Kasper Purunen: I don't know because it was not me who reached out initially. I think he was scouting for more modern platforms because traditional SOC 2 vendors are usually very enterprise-y and extremely expensive. So I guess he found Oneleet online.
Kevin Baker: Next steps?
Kasper Purunen: I'd say either Oscar or Ingemar. I think it's a 50/50 split between them most of the posting on LinkedIn. You can CC them -- firstname@bardo.se.
Kevin Baker: I'll send a draft along with some quote options for the backlink on the Oneleet site. And we'd like to send a gift. Do you have a good address?
Kasper Purunen: I can send you the address afterwards. Yeah, I can send you the address afterwards.`,
    summary: `Kasper Purunen, engineer and unofficial head of security at Bardo, handled the entire SOC 2 process himself in about two months (mid-September to November). He had prior experience with due diligence at a 150-200 person company, which made the process more manageable at Bardo's 15-person scale.

Key story: Bardo does carbon accounting using lifecycle assessments (LCAs) instead of cost-based estimates, meaning they can calculate the actual carbon footprint of what you bought rather than a statistical average. This makes their data both more accurate and more useful for EU regulatory compliance. They handle extremely sensitive financial data -- essentially all purchase history for their clients, including publicly listed companies.

Customers were asking for SOC 2 but hadn't pulled deals over it. Kasper's framing: "It's so much easier to just check that off instead of saying we're working on it." The team had security-first mindset from day one given the data they handle.

The post will come from Oscar or Ingemar (the founders), who are the active LinkedIn voices at Bardo. Kasper CC suggested emailing firstname@bardo.se.`,
  },

  atrix: {
    raw: `Kevin Baker: Your customers are pharma companies who have complex clinical data after trials -- doctor notes, side effects, prescribing data. You use AI to collect and serve it up in an easily digestible way?
Vitaliy Pankov: On a high level, yes. Not just drugs -- medical education programs, adverse events from clinical trials, outcomes of programs. The executives are interested in those outcomes and our tool distills this information and presents it with dashboards and reports. Before, groups of people -- sometimes whole companies -- specialized exclusively in making those reports manually. A single report for a clinical trial could take half a year. We optimize so that time-to-insights is as small as possible.
Kevin Baker: Tell me about Atrix.
Vitaliy Pankov: We started looking into MLR (medical legal review) around early 2023 -- early ChatGPT days. We tried an experiment there, it was too complex, so we pivoted to reporting and data distillation. Starting from late 2024 that's been our main focus -- data processing, reporting, analytics. The framework should be so easy a doctor or legal counsel can just type a few things and get the insights they need. We have contracts where companies act as beta testers and provide feedback actively -- without that domain knowledge you can't even know what you're looking for in medical data.
Kevin Baker: The data is extremely sensitive. What happens if it gets breached?
Vitaliy Pankov: A breach could be devastating. A single leak can lead to annihilation of the entire company. That's why even at our current scale we try to establish the best practices. We store everything on secure servers with no real-world outbound communication, only outbound to the internet. You can't get in without very specific backdoors and we literally try to shut each one. The database is encrypted at rest -- even I as a developer can't access parts of it without knowing the private key.
Kevin Baker: Was there a deal that forced SOC 2?
Vitaliy Pankov: We already knew from experience -- our CEO worked at Facebook, I worked with a British startup working with NHS -- we knew how important it was. It wasn't a milestone right away but by the time we were pushing for our first deal in 2024, we decided: before we start working, we have to implement all the right policies. SOC 2 requires constant monitoring and reporting. We still have HIPAA to finalize -- we're 95% through -- and GDPR is in exploratory phase.
Kevin Baker: How did you choose Oneleet?
Vitaliy Pankov: I believe it came through the Y Combinator network because our CEO was part of YC a couple years ago. Got recommended as a referral.
Kevin Baker: What surprised you?
Vitaliy Pankov: I was pleasantly surprised by how many monitors have to be put in place to be compliant. You think about those procedures as not really well thought out. But SOC 2 and HIPAA -- they are well thought out. You have monitors for all infrastructure components. Very specific policies to manage people, data access, hardware access, general resource management. You're not doing this just to get the checkmark. You're doing this because you want to be sure about your product, want it to do its job, and also want to have a healthy sleep.
Kevin Baker: Who will post this?
Vitaliy Pankov: When you prepare the post I'd like to loop our CEO Vera in. We'll double-check the details and she'll give the green light. It could come from my account or hers. But she needs to confirm regardless.
Kevin Baker: I'll draft a post using Vera's LinkedIn to match the tone.
Vitaliy Pankov: Vera's LinkedIn is the best place because she's very active there.`,
    summary: `Vitaliy Pankov is CTO/lead engineer at Atrix, an AI-powered clinical data analytics company based in Poland. They take massive amounts of clinical trial data -- doctor notes, adverse events, program outcomes -- and use AI to distill it into dashboards and reports that medical executives can actually use. What used to take a specialized team half a year to produce manually can now be turned around far faster.

The stakes are extremely high: a breach could literally end the company. Patient data, clinical trial results, and proprietary pharmaceutical research is extraordinarily sensitive. Vitaliy's line: "A single kind of leak can lead to annihilation of the entire company."

They came to SOC 2 proactively (via YC network / Oneleet referral) before any client demanded it, but with their first deal approaching in 2024 they decided to lock it down before starting work. HIPAA is 95% done. GDPR is next.

Vitaliy was genuinely impressed by how rigorous and well-designed the SOC 2 framework is -- "you're not doing this just to get the checkmark, you want a healthy sleep." The draft should come from CEO Vera's LinkedIn account, and should be written in her voice.`,
  },

  capi: {
    raw: `Kevin Baker: You started as Scrapybara -- virtual desktops for AI agents -- and noticed the biggest use case was coding. Is Capi AI built on top of Scrapybara or separate?
Haris Mehrzad: Initially it was, but it's now transitioning to be a completely separate product.
Kevin Baker: You can have 25 separate agents all coding on different virtual computers?
Haris Mehrzad: Basically yes.
Kevin Baker: Give me the quick journey.
Haris Mehrzad: Justin and I met in 2024 summer over an internship. We decided to do a YC startup together and pivoted a bunch of times. Around January-February 2025 we were working on Scrapybara -- VMs for AI agents. Around that time we felt it would be a nice idea to get SOC 2 compliance because we were a core infra provider and a lot of the people we wanted to work with were particular about needing software compliance. So we started that program. But as we kept building, we realized as a team we were much more suited towards building a product-level thing -- specifically coding agents, that's where our strengths were. Around mid-2025 we decided to pivot toward that, left the infra provider stuff behind. The second half of 2025 we were heads down just building. Now we're more in GTM growth.
Kevin Baker: With agents and virtual desktops, people give you access to their code and codebases. How do you approach security?
Haris Mehrzad: This actually couples with how we think products should work. Most coding agents work entirely locally -- you install the coding agent and it gets access to everything, your entire local file system. It can go rogue. Justin and I were always biased towards cloud environments because they're sandboxed, individual, ephemeral. You only put into the cloud VM what you actually need. Once the work is done it's destroyed -- we no longer retain access, it's gone. You can also control exactly what the agent can do because it's all in the cloud. And it allows greater parallelism.
Kevin Baker: Was there a forcing function for SOC 2?
Haris Mehrzad: Our initial motivation was: if we want people to use the infra product seriously, there's a great degree of trust required. Even apart from just having the SOC 2 badge, the process of setting up those systems and making ourselves compliant would actually make us a more secure and better product offering overall. Even apart from having the badge.
Kevin Baker: What were the biggest growing pains?
Haris Mehrzad: Our process was really long because as a company we transformed a lot while undergoing SOC 2. We basically changed our entire product, our entire stack. Every couple of weeks there'd be a new vendor and we'd have to add it and make sure it was compliant. The platform we started SOC 2 on didn't even exist by the end -- it was a Ship of Theseus situation. A completely different product, part by part replaced. So every new part that was added needed to once again be made compliant.
Kevin Baker: How did you choose Oneleet?
Haris Mehrzad: We had talked to Delve also around that point. And Delve was actually using our product for some of their core AI agent stuff before we were SOC 2 compliant. So the SOC 2 company was using a non-SOC 2-compliant thing for their SOC 2 work. That was kind of strange. But just talking to Bryan about the Oneleet process felt a lot more personal, more chill, simpler, straightforward.
Kevin Baker: How long was the process?
Haris Mehrzad: Seven or eight months at least, primarily because we were changing our stack so rapidly during that time. I was surprised we got it as fast as we did. At a previous company I watched SOC 2 take over a year and a half. I thought it was a six-month thing.
Kevin Baker: Anything about SOC 2 that surprised you?
Haris Mehrzad: SOC 2 is such a fluid thing. Before I thought it was a pretty standard, well-defined thing like HIPAA. It's actually a lot more fluid. Pros: it can adapt to your company and workflow and stack. Cons: someone can get really simple SOC 2 that's not comprehensive at all and just betrays the trust.
Kevin Baker: Who will post this?
Haris Mehrzad: It'll be me.`,
    summary: `Haris Mehrzad is co-founder of Capi AI (formerly Scrapybara), a coding agent built on cloud-based sandboxed environments. The company started as virtual desktops for AI agents (Scrapybara), earned SOC 2 in that incarnation, then pivoted entirely to a product-level coding agent -- meaning the platform they got SOC 2 on essentially no longer exists by the time they finished.

Key story: the Ship of Theseus problem. They changed their entire stack, their entire product, while simultaneously going through SOC 2. Every new vendor added needed to be re-evaluated. Seven to eight months total.

The Delve irony: Delve was actually using Capi AI's product for their own SOC 2 work while Capi AI wasn't yet SOC 2 compliant. "The SOC 2 company was using a non-SOC 2-compliant thing for their SOC 2 work."

Chose Oneleet over Delve because Bryan felt more personal, chill, and straightforward. Haris will post himself. He has a tech/founder Twitter/X voice -- punchy, a bit irreverent, direct.`,
  },

  nixtla: {
    raw: `Kevin Baker: When did you guys realize you needed SOC 2?
Carla Coll: As we were in the motion of selling to enterprises. We're a time series forecasting platform. Companies use us to predict sales -- and five years of very sensitive sales data passes through us. We needed not just to say "your data is safe" but to have external validation saying it. As we got into more complex enterprise sales processes, SOC 2 became not a nice-to-have but a must-have.
Kevin Baker: Tell me about Nixtla.
Carla Coll: I joined with no CRM, no process, nothing. Now we're selling big enterprise sales. It's been quite a journey. We have an open source product that big companies use as a package. Then we have TimeGPT -- there's an Enterprise API and a self-hosted version. A lot of clients are moving to self-hosting because they won't let data leave their premises. Even for self-hosted we maintained SOC 2 because it's still about the seal of approval even if we never see the data.
Kevin Baker: How early does data security come up in enterprise sales?
Carla Coll: Very early on. After the API trial point -- customers say "I cannot send this data through." So we do POCs where they self-host. SOC 2 becomes a checkpoint in the mid stages, closer to procurement. One of the things they have to check off.
Kevin Baker: Tell me about the Microsoft partnership.
Carla Coll: M12 (Microsoft) invested in us early on. We're also on Azure AI Foundry -- the same model running there under a different name: Timegen. Being a Microsoft partner is a complex, multilevel thing. Not easy to achieve. So that's super cool.
Kevin Baker: How are you thinking about the post and voice?
Carla Coll: We're literally rebranding. New website a couple weeks ago. We're trying to shift from technical IC-focused content to talking to business leaders and stakeholders. The previous content person had some issues with scientific accuracy so there wasn't total consistency. Maybe use the enterprise announcement from December -- Max drafted that.
Kevin Baker: Who's posting?
Carla Coll: We have around 11,000 followers on the company account. Max isn't big on LinkedIn so the algorithm isn't better either way. The company account works. I've been posting for two months.`,
    summary: `Carla Coll is Growth Lead at Nixtla, the time series forecasting platform behind TimeGPT and the open-source nixtlaverse. She's a former Head of Growth at Upfluence who came to Nixtla via a friend's YC startup connection. She joined with nothing -- no CRM, no process -- and has been building the go-to-market motion.

Nixtla handles extraordinarily sensitive data: five or more years of historical sales data from major enterprises, pharmaceutical companies, and research organizations. SOC 2 became essential as they moved into enterprise sales -- "not a nice-to-have but a must-have." Interestingly, they also have a self-hosted product where they never even see client data, but still maintained SOC 2 because "the seal of approval matters regardless."

They have Microsoft as an investor (M12) and are on Azure AI Foundry (where TimeGPT runs as "Timegen"). Enterprise sales are driven largely by the founder's 25-year network in the industry.

The post will come from the company account (11K followers). They're in the middle of a rebrand -- shifting from technical/IC-focused messaging to talking to business leaders. The draft should have a professional but not stuffy tone.`,
  },

  carelane: {
    raw: `Kevin Baker: How did you know you needed SOC 2?
Lars Spies: We learned very quickly that we absolutely required SOC 2 and all the other certifications just to be able to do business with larger clients. The companies we deal with -- pharma companies, research organizations -- have to adhere to extremely strict data privacy regulations, and as a result, so do we. It was driven by necessity. If you can't prove you're SOC 2 compliant from the get-go, larger CROs and pharma companies will not even consider working with you.
Kevin Baker: How big is the operation?
Lars Spies: We're in about 50 countries on basically all continents. We assist with clinical trials -- facilitating those for multinational clients.
Kevin Baker: What's your product actually?
Lars Spies: Carelane facilitates clinical trials for multinational pharma companies and research organizations. We manage the operational complexities across 50+ countries.
Kevin Baker: How do you handle the data security outside of just the certificate?
Lars Spies: I mean, we go way, way beyond the requirements of SOC 2, HIPAA, or any of the others. That's what we have on our website in the security section. Top of the line in everything. But you'd want to talk to Yannick or Amanda for specifics.
Kevin Baker: Does the EU having a single standard help?
Lars Spies: I'm assuming it's one EU standard rather than country by country. It's never come up that we need to deal with different regulations in different countries within the EU.
Kevin Baker: How does SOC 2 help in procurement?
Lars Spies: Any of the larger CROs, larger pharma companies -- if you can't prove you're SOC 2 compliant from the get-go, they will not even consider working with you. So it definitely opens doors to be able to have some of these larger clients. Universities and smaller research institutions have slightly lighter requirements, but anything enterprise -- you need the certification.
Kevin Baker: Who will post this?
Lars Spies: It will come from Yannick's account. He's at a conference and super busy at the moment. He hasn't done much personal posting yet -- we had a couple of LinkedIn posts a couple of weeks ago but I wrote those. We're revamping our marketing at the moment. Professional, yet not boring. Trying to strike a balance. It's a conservative field, so when in doubt, err on the side of being professional.
Kevin Baker: For the post -- how are you currently acquiring customers?
Lars Spies: Word of mouth. One of our co-founders has 25 years of experience in the industry already, so he's got a large network of research institutions, university personnel. That's how we've been reaching them. Q2/Q3 onwards, marketing and direct outreach is what's on the agenda.`,
    summary: `Lars Spies is Chief of Staff / Business Operations at Carelane, a clinical trial facilitation company operating in 50+ countries across all major continents. He joined 7-8 months ago. The post will come from Yannick (CEO/co-founder), who has not been very active on LinkedIn but is starting to build a presence.

Carelane works with pharma companies and research organizations to manage the operational complexity of multinational clinical trials. The data they handle is intensely sensitive: patient health data across international jurisdictions, clinical trial results, and pharmaceutical R&D information.

SOC 2 was non-negotiable: "If you can't prove you're SOC 2 compliant from the get-go, larger CROs and pharma companies will not even consider working with you." Pure business necessity. No philosophical journey -- just: this is the price of admission to enterprise healthcare.

Growth so far has been entirely through the founding team's network (co-founder has 25 years in clinical trials). They're about to launch their first formal marketing campaign. LinkedIn is a key channel.

Lars says the company goes "way, way beyond" SOC 2 requirements for security, but Yannick/Amanda would need to speak to specifics. The post should be professional but have personality -- Lars specifically said "not boring."`,
  },
};

// ─── Project definitions ──────────────────────────────────────────────────────

const EXISTING_PROJECTS = [
  {
    matchName: "Bardo",
    update: {
      companyName: "Bardo",
      companyWebsite: "https://bardo.se",
      contactEmail: "kasper@bardo.se",
      contactTitle: "Engineer / Head of Security",
      posterName: "Oscar (Bardo Co-founder)",
      callDate: new Date("2026-03-30T16:30:00.000Z"),
      stage: "call_complete" as const,
    },
    transcriptKey: "bardo",
    posterTitle: "Co-founder",
    posterLinkedInHint: "Oscar Bardo LinkedIn",
  },
  {
    matchName: "Aetrex",
    update: {
      companyName: "Atrix",
      companyWebsite: "https://atrix.ai",
      contactEmail: "vitaliy@atrix.ai",
      contactTitle: "CTO / Lead Engineer",
      posterName: "Vera (Atrix CEO)",
      callDate: new Date("2026-03-27T18:30:00.000Z"),
      stage: "call_complete" as const,
    },
    transcriptKey: "atrix",
    posterTitle: "CEO",
    posterLinkedInHint: "Vera CEO Atrix LinkedIn",
  },
  {
    matchName: "Capi AI",
    update: {
      companyName: "Capi AI (Scrapybara)",
      companyWebsite: "https://scrapybara.com",
      contactEmail: "haris@scrapybara.com",
      contactTitle: "Co-founder",
      posterName: "Haris Mehrzad",
      callDate: new Date("2026-03-25T20:00:00.000Z"),
      stage: "call_complete" as const,
    },
    transcriptKey: "capi",
    posterTitle: "Co-founder",
    posterLinkedInHint: "Haris Mehrzad LinkedIn founder",
  },
  {
    matchName: "Nixtla",
    update: {
      companyName: "Nixtla",
      companyWebsite: "https://nixtla.io",
      contactEmail: "carla@nixtla.io",
      contactTitle: "Growth Lead",
      posterName: "Nixtla Company Account",
      callDate: new Date("2026-03-16T19:30:00.000Z"),
      stage: "call_complete" as const,
    },
    transcriptKey: "nixtla",
    posterTitle: "Growth Lead",
    posterLinkedInHint: "Nixtla LinkedIn company page",
  },
  {
    matchName: "Carelane",
    update: {
      companyName: "Carelane",
      companyWebsite: "https://carelane.io",
      contactEmail: "lars@carelane.io",
      contactTitle: "Chief of Staff",
      posterName: "Yannick (Carelane CEO)",
      callDate: new Date("2026-03-16T17:45:00.000Z"),
      stage: "call_complete" as const,
    },
    transcriptKey: "carelane",
    posterTitle: "CEO & Co-founder",
    posterLinkedInHint: "Yannick Carelane CEO LinkedIn",
  },
];

const NEW_PROJECTS = [
  {
    companyName: "Nia Health",
    companyWebsite: "https://niahealth.co",
    contactName: "Saif",
    contactEmail: "saif@niahealth.co",
    callDate: new Date("2026-03-04T15:15:00.000Z"),
    stage: "call_complete" as const,
  },
  {
    companyName: "Vector",
    companyWebsite: "https://vector.co",
    contactName: "Andrew McGlathery",
    contactEmail: "andrew@vector.co",
    callDate: new Date("2026-03-17T16:30:00.000Z"),
    stage: "call_complete" as const,
  },
  {
    companyName: "Diligent AI",
    companyWebsite: "https://godiligent.ai",
    contactName: "Ahmed Gaber",
    contactEmail: "ahmed@godiligent.ai",
    callDate: new Date("2026-04-01T12:30:00.000Z"),
    stage: "booked" as const,
  },
  {
    companyName: "LeasePilot",
    companyWebsite: "https://leasepilot.co",
    contactName: "Lior Kedmi",
    contactEmail: "lkedmi@leasepilot.co",
    callDate: new Date("2026-04-01T13:15:00.000Z"),
    stage: "booked" as const,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`\n[${new Date().toISOString()}] ${msg}`);
}

async function runPipelineForProject(projectId: string, opts: {
  companyName: string;
  companyWebsite: string | null;
  contactName: string;
  contactEmail: string | null;
  contactTitle: string | null;
  posterName: string;
  posterTitle: string;
  transcriptKey: string;
}) {
  const t = TRANSCRIPTS[opts.transcriptKey];
  if (!t) throw new Error(`No transcript for key: ${opts.transcriptKey}`);

  // 1. Generate research
  log(`${opts.companyName}: Generating research...`);
  const research = await generateResearch({
    companyName: opts.companyName,
    companyWebsite: opts.companyWebsite,
    contactName: opts.contactName,
    contactEmail: opts.contactEmail,
    contactTitle: opts.contactTitle,
    contactLinkedinUrl: null,
  });

  await prisma.research.deleteMany({ where: { projectId } });
  await prisma.research.createMany({
    data: [
      { projectId, type: "company_brief", content: research.companyBrief },
      { projectId, type: "person_brief", content: research.personBrief },
      { projectId, type: "call_questions", content: research.callQuestions },
    ],
  });
  log(`${opts.companyName}: Research saved.`);

  // 2. Save transcript + summarize
  log(`${opts.companyName}: Summarizing transcript...`);
  const { summary, identifiedPoster } = await summarizeTranscript(
    t.raw,
    opts.companyName,
    opts.contactName
  );

  await prisma.transcript.deleteMany({ where: { projectId } });
  await prisma.transcript.create({
    data: {
      projectId,
      rawTranscript: t.raw,
      callSummary: summary,
      identifiedPoster,
    },
  });
  log(`${opts.companyName}: Transcript saved. Poster identified: ${identifiedPoster}`);

  // Update stage
  await prisma.project.update({
    where: { id: projectId },
    data: { stage: "call_complete" },
  });

  // 3. Writing analysis (use transcript as voice proxy)
  log(`${opts.companyName}: Analyzing writing style...`);
  const writingAnalysis = await analyzeWriting(
    [t.raw],
    `${opts.posterName} (voice extracted from call transcript with ${opts.contactName})`
  );

  await prisma.writingAnalysis.deleteMany({ where: { projectId } });
  await prisma.writingAnalysis.create({
    data: {
      projectId,
      subjectName: opts.posterName,
      analysis: writingAnalysis,
    },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: { stage: "writing_analyzed" },
  });
  log(`${opts.companyName}: Writing analysis saved.`);

  // 4. Generate draft
  log(`${opts.companyName}: Generating draft...`);
  const { content, quoteOptions } = await generateDraft({
    companyBrief: research.companyBrief,
    personBrief: research.personBrief,
    callSummary: summary,
    writingAnalysis,
    posterName: opts.posterName,
    posterTitle: opts.posterTitle,
    companyName: opts.companyName,
  });

  // Delete old drafts and create new one
  await prisma.postDraft.deleteMany({ where: { projectId } });
  await prisma.postDraft.create({
    data: {
      projectId,
      version: 1,
      content,
      quoteOptions,
      status: "draft",
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { stage: "draft_ready" },
  });

  await prisma.activityLog.create({
    data: {
      projectId,
      action: "full_pipeline_complete",
      details: `Research, transcript, writing analysis, and draft generated via full-pipeline script.`,
    },
  });

  log(`${opts.companyName}: Draft ready! ✓`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Starting full pipeline sync ===");

  // Step 1: Update existing projects
  log("\n--- Updating existing projects ---");
  for (const p of EXISTING_PROJECTS) {
    const existing = await prisma.project.findFirst({
      where: { companyName: { contains: p.matchName.split(" ")[0] } },
    });

    if (!existing) {
      log(`WARNING: Could not find project matching "${p.matchName}"`);
      continue;
    }

    await prisma.project.update({
      where: { id: existing.id },
      data: p.update,
    });
    log(`Updated: ${p.update.companyName} (id: ${existing.id})`);

    // Run full pipeline
    await runPipelineForProject(existing.id, {
      companyName: p.update.companyName,
      companyWebsite: p.update.companyWebsite ?? null,
      contactName: existing.contactName,
      contactEmail: p.update.contactEmail,
      contactTitle: p.update.contactTitle,
      posterName: p.update.posterName ?? existing.contactName,
      posterTitle: p.posterTitle,
      transcriptKey: p.transcriptKey,
    });
  }

  // Step 2: Add new projects (skip if already exist)
  log("\n--- Adding missing projects ---");
  for (const np of NEW_PROJECTS) {
    const existing = await prisma.project.findFirst({
      where: { contactEmail: np.contactEmail },
    });

    if (existing) {
      log(`Already exists: ${np.companyName} — skipping`);
      continue;
    }

    const created = await prisma.project.create({ data: np });
    log(`Created: ${np.companyName} (id: ${created.id})`);

    // Generate research for new projects
    log(`${np.companyName}: Generating research...`);
    const research = await generateResearch({
      companyName: np.companyName,
      companyWebsite: np.companyWebsite,
      contactName: np.contactName,
      contactEmail: np.contactEmail,
      contactTitle: null,
      contactLinkedinUrl: null,
    });
    await prisma.research.createMany({
      data: [
        { projectId: created.id, type: "company_brief", content: research.companyBrief },
        { projectId: created.id, type: "person_brief", content: research.personBrief },
        { projectId: created.id, type: "call_questions", content: research.callQuestions },
      ],
    });
    await prisma.project.update({
      where: { id: created.id },
      data: { stage: np.stage === "booked" ? "researched" : np.stage },
    });
    log(`${np.companyName}: Research saved.`);
  }

  // Step 3: Run research for AlpacaX if it exists and has no research
  log("\n--- Checking AlpacaX ---");
  const alpacax = await prisma.project.findFirst({
    where: { companyName: { contains: "Alpaca" } },
    include: { research: true },
  });
  if (alpacax && alpacax.research.length === 0) {
    log(`AlpacaX: Generating research...`);
    const research = await generateResearch({
      companyName: alpacax.companyName,
      companyWebsite: alpacax.companyWebsite,
      contactName: alpacax.contactName,
      contactEmail: alpacax.contactEmail,
      contactTitle: alpacax.contactTitle,
      contactLinkedinUrl: alpacax.contactLinkedinUrl,
    });
    await prisma.research.createMany({
      data: [
        { projectId: alpacax.id, type: "company_brief", content: research.companyBrief },
        { projectId: alpacax.id, type: "person_brief", content: research.personBrief },
        { projectId: alpacax.id, type: "call_questions", content: research.callQuestions },
      ],
    });
    log(`AlpacaX: Research saved.`);
  }

  log("\n=== Full pipeline complete ===");
  log("Projects with drafts ready: Bardo, Atrix, Capi AI, Nixtla, Carelane");
  log("Projects with research only: Nia Health, Vector, Diligent AI, LeasePilot, AlpacaX");
}

main()
  .catch((e) => {
    console.error("Pipeline failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
