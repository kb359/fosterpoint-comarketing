export async function sendSlackBriefing(project: {
  companyName: string;
  companyDescription: string | null;
  contactName: string;
  contactTitle: string | null;
  contactBio: string | null;
  callDate: Date | null;
  research: Array<{ type: string; content: string }>;
}) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn("SLACK_BOT_TOKEN not set, skipping Slack briefing");
    return;
  }

  const channelId = "C0AQ74D9U0L";

  const companyBrief =
    project.research.find((r) => r.type === "company_brief")?.content ??
    project.companyDescription ??
    "No company brief available.";

  const personBrief =
    project.research.find((r) => r.type === "person_brief")?.content ??
    project.contactBio ??
    "No person brief available.";

  const callQuestions =
    project.research.find((r) => r.type === "call_questions")?.content ??
    "No call questions generated yet.";

  const callTimeStr = project.callDate
    ? project.callDate.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "TBD";

  const truncate = (text: string, max: number): string =>
    text.length > max ? text.slice(0, max - 3) + "..." : text;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Co-Marketing Call Today: ${project.companyName}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Call Time:*\n${callTimeStr}`,
        },
        {
          type: "mrkdwn",
          text: `*Contact:*\n${project.contactName}${project.contactTitle ? ` - ${project.contactTitle}` : ""}`,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Company Brief*\n${truncate(companyBrief, 2900)}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Person Brief*\n${truncate(personBrief, 2900)}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Call Questions*\n${truncate(callQuestions, 2900)}`,
      },
    },
  ];

  const fallbackText = `Co-Marketing Call Today: ${project.companyName} with ${project.contactName} at ${callTimeStr}`;

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: channelId,
      text: fallbackText,
      blocks,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("Slack API error:", data.error);
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data;
}
