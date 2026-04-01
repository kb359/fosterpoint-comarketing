/**
 * Updates Bardo, Atrix, and Scrapybara/Capi AI with fresh Fireflies transcripts.
 * Also re-runs research with improved prompts, writing analysis, and draft generation.
 *
 * Run:
 *   ANTHROPIC_API_KEY="sk-..." DATABASE_URL="..." DIRECT_URL="..." \
 *   npx ts-node --skip-project --compiler-options '{"module":"commonjs","esModuleInterop":true}' \
 *   scripts/update-fresh-transcripts.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { generateResearch } from "../src/lib/ai/research";
import { summarizeTranscript } from "../src/lib/ai/transcript";
import { analyzeWriting } from "../src/lib/ai/writing";
import { generateDraft } from "../src/lib/ai/draft";

const prisma = new PrismaClient();

function log(msg: string) {
  console.log(`\n[${new Date().toISOString()}] ${msg}`);
}

// ─── Full raw transcripts from Fireflies ─────────────────────────────────────

const BARDO_TRANSCRIPT = `Kevin Baker: Hey, Casper.
Kasper Purunen: Hey, man. Sorry, I totally forgot. I usually don't take meetings this late.
Kevin Baker: I know, I know. I'm literally flying to Europe in four days so the timing is off. Okay so I'm working with Oneleet. I think they sent you some context. I'm helping them tell their customer stories. Then we have someone on your team post about -- okay here's how we got compliant, here's why, here's the story. And then we're going to boost it with a ton of ad budget and also get you guys a backlink on the website. First, is this post coming from your account or one of the founders or who wants to put it out?
Kasper Purunen: Not from my account for sure because I'm very inactive on LinkedIn. Probably some of the founders -- they're the ones driving most of the traffic on LinkedIn.
Kevin Baker: Were you an engineer there? And were you spearheading the compliance process, like were you the main point of contact with Oneleet?
Kasper Purunen: Yeah, I was basically doing the whole thing.
Kevin Baker: Have you done SOC 2 before?
Kasper Purunen: No, I haven't, but at my previous job I was engineering manager and head of platform. I basically did a due diligence for when that company was about to be sold -- about 150-200 people. I've done similar processes before but not SOC 2 specifically.
Kevin Baker: What surprised you about the process? Harder or easier?
Kasper Purunen: It was actually easier than I thought. A lot of what I did I had already done during the due diligence at my previous job. And being a company of 15 people where everything is greenfield, you can write the policies and enforce them at the same time. You don't have to move the culture of 200 people.
Kevin Baker: Did going through compliance change how you were building or did it actually make you more secure -- not just a checkbox?
Kasper Purunen: There are some sobering things you have to do, but to be honest, a lot of these things were things we had already thought about even before SOC 2 because we knew we were going to need it. We had spoken from day one that customers are going to ask for this. It's a pretty senior team so we were in pretty good shape already. Sure there were definitely things we had to look over and make better.
Kevin Baker: What would a breach look like with what you guys do?
Kasper Purunen: How carbon accounting works today is you do cost-based estimates -- you multiply the cost of what you bought by an index. But we do LCAs -- lifecycle assessments -- and actual calculations on the specific items you purchased. So we have access to all your financial data, all the stuff you've been buying. Especially if you're a listed public company doing R&D for a new product, someone knowing exactly what you've been buying -- in some cases that would be pretty detrimental.
Kevin Baker: Did any customers force you to get SOC 2 or was it more of a pressure thing?
Kasper Purunen: No forcing function, but customers were asking for it. I wouldn't say we lost any deals because we didn't have it, but it's so much easier to just check that off instead of saying we're working on it. Just having it -- you can drop the conversation.
Kevin Baker: How did Bardo choose Oneleet?
Kasper Purunen: To be honest I don't know because it was not me who reached out initially. I think he was scouting for more modern platforms because traditional SOC 2 vendors are usually very enterprise-y and extremely expensive. So I guess he found Oneleet online.
Kevin Baker: How did you get involved in Bardo?
Kasper Purunen: The CTO reached out to me even before Bardo existed. It took like one year before I joined -- he was doing the longest recruitment thing I've ever seen. He knew my previous manager and didn't want to snag me. So he was bouncing ideas with me and talking about Bardo before I joined, and then I said yeah this seems like a nice place to be.
Kevin Baker: Did they give you a CISO or temporary person?
Kasper Purunen: No, it was me mostly. I was both managing and doing all the heavy lifting. I'd say I was able to do probably 95% of everything myself. I started in mid-September and we were done in November. So maybe two months of actual work.
Kevin Baker: How long did it take and how have you built security into the platform itself?
Kasper Purunen: Two months. We're basically following all the best practices. We have presentations on the standard stuff -- how we do data handling and all these kinds of things -- that we usually send over. If there are any questions I usually just answer them.
Kevin Baker: Next steps -- do you know which founder would be more likely to post?
Kasper Purunen: I'd say either Oscar or Ingemar. I think it's about 50-50 between them on LinkedIn. You can also CC them in the email -- firstname@bardo.se.
Kevin Baker: I'll send a draft along with some quote options for the backlink on the Oneleet site, and link it back to you guys. And we'd like to send a gift. Is there a good address?
Kasper Purunen: I can send you the address afterwards.`;

const ATRIX_TRANSCRIPT = `Kevin Baker: So if I have this right, your customers are pharma companies who have all this data after they release a drug -- doctor notes, how it's being prescribed, side effects, competitive intelligence. You guys are using your tool to collect all this data and serve it up in a way that's easily digestible.
Vitaliy Pankov: On a high level, this is true. Not just about drugs -- medical education programs, adverse events coming out of clinical trials, how patients react to those programs. The outcomes of those trials and programs are what the executives are usually interested in. Our tool distills this information, extracts the value, and presents it in a format that's easy to comprehend -- dashboards, reports, et cetera.
Kevin Baker: How are companies doing this right now without you? Is it a lot of manual work?
Vitaliy Pankov: That's one of the primary reasons we jumped into this field. Before, there were groups of people -- maybe even companies -- specialized exclusively on making those reports. All manual labor. You had to go in, look for all those notes, articles, PowerPoints, everything you could get your hands on. A single report for a clinical trial could take half a year. It's also expensive because you need specialists who actually know what they're looking into -- the data can be really specific. Our tool just tries to optimize the process so that the time from end of program to insights is as small as possible.
Kevin Baker: Give me a quick overview of how you got into this and how big the team is.
Vitaliy Pankov: We started in early 2023, late 2022 -- early days of ChatGPT. Those companies were spending so much money and time on things that were ideal candidates for optimization. We started by looking into MLR -- medical legal review -- the procedure that helps companies prepare drugs for final stages of clinical trials. We tried an experiment there, it turned out to be more than we could chew. So we stepped back, found the demand for reporting and data analysis, and that's what we focused on. Starting from late 2024, data processing, reporting, and analytics are the main things. The idea is a framework where anybody -- a doctor, a legal counsel of a medical company -- can just type a couple of things in the chat and get the responses they're looking for. We have contracts where companies act as beta testers, actively participating in development, giving us feedback from end users. Without that domain knowledge it's impossible to figure out what you actually want to get out of the data.
Vitaliy Pankov: Team right now: four engineers, two outside contractors, a QA engineer, an infrastructure engineer -- so eight. We have a head of operations with an assistant, the CEO driving the company forward, and a person responsible for marketing. Team is growing.
Kevin Baker: The data is extremely sensitive. What happens if it gets breached?
Vitaliy Pankov: It is a real problem and a very dangerous one. One of the main reasons we're going through SOC 2, HIPAA, and looking into GDPR for European markets is because we know a breach could be devastating. A single leak can lead to annihilation of the entire company. That's why even at our current scale we try to establish the best practices possible. We store everything on secure servers that have no real-world inbound communication -- they can only reach out to the internet, but as an outsider you can't get in without very specific backdoors, and each and every one we literally try to shut. The database is encrypted at rest -- even I as a developer can't access some parts without knowing the private key.
Kevin Baker: Was there a deal that forced you to get SOC 2?
Vitaliy Pankov: We already had experience in sensitive fields. Our CEO worked at Facebook. I had experience with a British startup working with the NHS. We knew how important those things are. We didn't plan SOC 2 as a milestone right away -- we knew it would come but didn't have a clear deadline. By the time we started pushing for our first deal around 2024, we decided: now, before we start working, we have to implement all the right policies. As the number of clients grew our confidence in this decision grew. SOC 2 requires constant monitoring and reporting. We still have HIPAA to finalize -- we're like 95% through, just a couple of low-hanging fruits left. GDPR is in an exploratory phase.
Kevin Baker: How did you choose Oneleet?
Vitaliy Pankov: I believe it came through the Y Combinator network because our CEO was part of YC a couple years ago and they got recommended as a referral.
Kevin Baker: Were you the main point of contact?
Vitaliy Pankov: Both me and the CEO were the primary contacts. I was responsible for the implementation of most things. The CEO was responsible for documentation, policy establishment, and high-level concepts that require administrative power I don't have.
Kevin Baker: Had you done compliance before?
Vitaliy Pankov: First time leading it from scratch. I was part of a framework establishing policies and worked on specific GDPR implementation tasks at a previous company, but those were tasks of a subset -- not a global strategy. Here it's installment from scratch.
Kevin Baker: What surprised you?
Vitaliy Pankov: I was pleasantly surprised by how many monitors have to be put in place to be compliant. Every now and then you think about those procedures as not really well thought out. But SOC 2 and HIPAA -- they are well thought out. You have to install monitors for all components of your infrastructure. Very specific policies to manage people in your company, people who work with your company, data access, hardware access, general resource management -- all of that is covered. You're not doing this just to get the checkmark. You're doing this because you want to be sure about your product, want it to do its job, and also want a healthy sleep.
Kevin Baker: Who will post this?
Vitaliy Pankov: When you prepare the post I'd like to loop in our CEO Vera. She'll double-check and give the green light. It could come from my account or hers, but she needs to confirm regardless.
Kevin Baker: I'll use Vera's LinkedIn to match the tone.
Vitaliy Pankov: Vera's LinkedIn is the best place because she's very active there.
Kevin Baker: We'd also like to send a gift to your office address.
Vitaliy Pankov: I'll email you the office address either later today or Monday.`;

const SCRAPYBARA_TRANSCRIPT = `Kevin Baker: So you guys started as Scrapybara -- virtual desktops for agents -- and then noticed the biggest use case was coding. Is Capi AI built on top of Scrapybara or is it a separate product?
Haris Mehrzad: It was initially, but it's now transitioning more and more to be a completely separate product.
Kevin Baker: And it's built for coding -- like an IDE where you could have 25 separate agents all coding on different virtual computers?
Haris Mehrzad: Basically yes.
Kevin Baker: Give me a quick overview of how you both got to where you're at.
Haris Mehrzad: Justin and I met in 2024 summer over an internship. We decided to do a YC startup together and pivoted a bunch of times. Around January or February of 2025 we were working on Scrapybara -- VMs for AI agents. Around that time we felt it would be a nice idea to get SOC 2 compliance because we were a core infra provider and a lot of the people we wanted to work with were particular about needing software compliance. So we started that program. But as we kept building, we realized we as a team were much more suited towards building a product-level thing -- specifically coding agents, because that's where our strengths were and what we found most interesting. Around mid-2025 we decided to pivot toward that, leave the infra stuff behind, and just build a product ourselves -- a coding agent. The second half of 2025 we were heads down just building. Now we're more in GTM growth mode.
Kevin Baker: With agents and virtual desktops, people give you access to their code and codebases. How do you approach security outside of SOC 2?
Haris Mehrzad: This actually couples with how we think products should work. Most coding agents work entirely locally -- you install it and it gets access to everything, your entire local file system. It can go rogue and look at your documents, everything. Justin and I were always biased towards cloud environments because they're sandboxed, individual, ephemeral. You only put into the cloud VM what you actually need for the work. Once the work is done it's destroyed -- we no longer retain that, it's gone. You can also have way more control about what the agent can actually do because it's all up in the cloud in parallel.
Kevin Baker: Was there any forcing function for SOC 2, or did you get it before you had customers?
Haris Mehrzad: Our initial motivation was: if we want people to use this infra product seriously, there's a great degree of trust required. And even apart from just having the SOC 2 badge, undergoing the process and making ourselves compliant would actually make us a more secure and better product offering overall. Even apart from having the badge.
Kevin Baker: What were the biggest growing pains during the process?
Haris Mehrzad: Our process was really long because as a company we transformed a lot while we were undergoing SOC 2. We basically changed our entire product, our entire stack. Every couple of weeks there would be a new vendor we're using and we'd have to add it and make sure it was compliant. The platform we started SOC 2 on didn't even exist by the end -- it was a Ship of Theseus situation. A completely different product, part by part replaced. So every new part that was added needed to once again be made compliant.
Kevin Baker: How did you choose Oneleet over other vendors?
Haris Mehrzad: We had talked to Delve also around that point. And Delve was actually using our product for some of their core AI agent offerings before we were SOC 2 compliant. So the SOC 2 company was using a non-SOC 2-compliant thing for their SOC 2 work for clients. That was kind of strange to us. But just talking to Brian about the Oneleet process felt a lot more personal, more chill, simpler, more straightforward.
Kevin Baker: How long was the process with Oneleet?
Haris Mehrzad: Seven or eight months at least, primarily because we were changing our stack so rapidly during that time. I was surprised we got it as fast as we did. At a previous company I watched SOC 2 take over a year and a half with Drata. I thought it was supposed to be a six-month thing.
Kevin Baker: Did you have any pleasant surprises?
Haris Mehrzad: It's interesting to me how SOC 2 is such a fluid thing -- you as a company can make it as rigorous or as simple as you want. Before we actually went through it, I thought SOC 2 was supposed to be a pretty standard, well-defined thing like HIPAA. It's actually a lot more fluid. The pro is it can adapt to your company and your workflow and your stack. The con is someone can get really simple SOC 2 that's not comprehensive at all and just betrays the SOC 2 trust thing.
Kevin Baker: Who will post this?
Haris Mehrzad: It'll be me.
Kevin Baker: Any other resources I should look at to get your voice?
Haris Mehrzad: We have a blog on our website -- mostly technical stuff. We also actually made a blog post about SOC 2 compliance too.
Kevin Baker: I'll send you a draft, some quote options for the backlink, and I'll get the plaque ordered today. What's your office address?
Haris Mehrzad: I'll send our apartment address into the meeting chat because we're moving offices -- I don't want it to get lost in transit.`;

// ─── Pipeline runner ──────────────────────────────────────────────────────────

async function runUpdate(opts: {
  matchName: string;
  companyName: string;
  companyWebsite: string;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  posterName: string;
  posterTitle: string;
  rawTranscript: string;
  callDate: Date;
}) {
  log(`\n=== ${opts.companyName} ===`);

  const project = await prisma.project.findFirst({
    where: { companyName: { contains: opts.matchName, mode: "insensitive" } },
  });

  if (!project) {
    log(`NOT FOUND in DB: ${opts.matchName}. Skipping.`);
    return;
  }

  log(`Found project: ${project.companyName} (${project.id})`);

  // Update project metadata
  await prisma.project.update({
    where: { id: project.id },
    data: {
      companyName: opts.companyName,
      companyWebsite: opts.companyWebsite,
      contactEmail: opts.contactEmail,
      contactTitle: opts.contactTitle,
      posterName: opts.posterName,
      callDate: opts.callDate,
      stage: "call_complete",
    },
  });

  // 1. Regenerate research with improved prompts
  log(`${opts.companyName}: Generating research...`);
  const research = await generateResearch({
    companyName: opts.companyName,
    companyWebsite: opts.companyWebsite,
    contactName: opts.contactName,
    contactEmail: opts.contactEmail,
    contactTitle: opts.contactTitle,
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
  log(`${opts.companyName}: Research saved.`);
  log(`  Company: ${research.companyBrief.slice(0, 120)}...`);
  log(`  Person: ${research.personBrief.slice(0, 120)}...`);

  // 2. Summarize transcript
  log(`${opts.companyName}: Summarizing transcript...`);
  const { summary, identifiedPoster } = await summarizeTranscript(
    opts.rawTranscript,
    opts.companyName,
    opts.contactName
  );

  await prisma.transcript.deleteMany({ where: { projectId: project.id } });
  await prisma.transcript.create({
    data: {
      projectId: project.id,
      rawTranscript: opts.rawTranscript,
      callSummary: summary,
      identifiedPoster,
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { stage: "call_complete" },
  });
  log(`${opts.companyName}: Transcript saved. Poster: ${identifiedPoster}`);

  // 3. Writing analysis
  log(`${opts.companyName}: Analyzing writing style...`);
  const writingAnalysis = await analyzeWriting(
    [opts.rawTranscript],
    `${opts.posterName} (voice extracted from call transcript with ${opts.contactName})`
  );

  await prisma.writingAnalysis.deleteMany({ where: { projectId: project.id } });
  await prisma.writingAnalysis.create({
    data: {
      projectId: project.id,
      subjectName: opts.posterName,
      analysis: writingAnalysis,
    },
  });

  await prisma.project.update({
    where: { id: project.id },
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

  await prisma.postDraft.deleteMany({ where: { projectId: project.id } });
  await prisma.postDraft.create({
    data: {
      projectId: project.id,
      version: 1,
      content,
      quoteOptions: quoteOptions as object[],
      status: "draft",
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { stage: "draft_ready" },
  });

  log(`${opts.companyName}: Draft saved. Stage: draft_ready ✓`);
  log(`\n--- DRAFT PREVIEW ---\n${content.slice(0, 400)}...\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("Starting fresh transcript updates...");

  await runUpdate({
    matchName: "Bardo",
    companyName: "Bardo",
    companyWebsite: "https://bardo.se",
    contactName: "Kasper Purunen",
    contactEmail: "kasper@bardo.se",
    contactTitle: "Engineer / Head of Security",
    posterName: "Oscar (Bardo Co-founder)",
    posterTitle: "Co-founder",
    rawTranscript: BARDO_TRANSCRIPT,
    callDate: new Date("2026-03-30T16:30:00.000Z"),
  });

  await runUpdate({
    matchName: "Atrix",
    companyName: "Atrix",
    companyWebsite: "https://atrix.ai",
    contactName: "Vitaliy Pankov",
    contactEmail: "vitaliy@atrix.ai",
    contactTitle: "CTO / Lead Engineer",
    posterName: "Vera (Atrix CEO)",
    posterTitle: "CEO",
    rawTranscript: ATRIX_TRANSCRIPT,
    callDate: new Date("2026-03-27T18:30:00.000Z"),
  });

  await runUpdate({
    matchName: "Capi",
    companyName: "Capi AI (Scrapybara)",
    companyWebsite: "https://scrapybara.com",
    contactName: "Haris Mehrzad",
    contactEmail: "haris@scrapybara.com",
    contactTitle: "Co-founder",
    posterName: "Haris Mehrzad",
    posterTitle: "Co-founder",
    rawTranscript: SCRAPYBARA_TRANSCRIPT,
    callDate: new Date("2026-03-25T20:00:00.000Z"),
  });

  log("\nAll done ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
