const PB_API = "https://api.phantombuster.com/api/v2";

export interface LinkedInPost {
  text: string;
  url?: string;
  date?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pbRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${PB_API}${path}`, {
    ...options,
    headers: {
      "X-Phantombuster-Key": process.env.PHANTOMBUSTER_API_KEY ?? "",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`PhantomBuster API error: ${res.status}`);
  return res.json();
}

const LINKEDIN_ACTIVITY_EXTRACTOR_ID = "4284604939628682";

async function pollUntilDone(
  agentId: string,
  containerId: string,
  timeoutMs = 180_000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 6000));
    try {
      const data = await pbRequest(
        `/agents/fetch-output?id=${agentId}&containerId=${containerId}`
      );
      // v2 fetch-output uses status field + isAgentRunning
      if (data.status === "finished" || data.isAgentRunning === false) {
        return true;
      }
    } catch {
      // keep polling
    }
  }
  return false;
}

export async function scrapeLinkedInPosts(
  profileUrl: string
): Promise<LinkedInPost[]> {
  const apiKey = process.env.PHANTOMBUSTER_API_KEY;
  if (!apiKey) return [];

  const agentId = LINKEDIN_ACTIVITY_EXTRACTOR_ID;

  try {
    // Fetch agent info: get saved argument (has sessionCookie) + S3 folder paths
    const agentInfo = await pbRequest(`/agents/fetch?id=${agentId}`);
    let savedArg: Record<string, unknown> = {};
    if (agentInfo.argument) {
      try { savedArg = JSON.parse(agentInfo.argument); } catch { /* use empty */ }
    }

    // Merge: preserve sessionCookie + userAgent, override URL + count
    const argument = JSON.stringify({
      ...savedArg,
      spreadsheetUrl: profileUrl,
      numberMaxOfPosts: 50,
      activitiesToScrape: ["Post"],
    });

    const launch = await pbRequest("/agents/launch", {
      method: "POST",
      body: JSON.stringify({ id: agentId, argument }),
    });

    const containerId = launch.containerId ?? launch.data?.containerId;
    if (!containerId) return [];

    const finished = await pollUntilDone(agentId, containerId);
    if (!finished) return [];

    // Results are saved to S3 — fetch them directly
    const { orgS3Folder, s3Folder } = agentInfo;
    const csvName = (savedArg.csvName as string) ?? "result";
    const s3Url = `https://phantombuster.s3.amazonaws.com/${orgS3Folder}/${s3Folder}/${csvName}.json`;

    const res = await fetch(s3Url);
    if (!res.ok) return [];
    const posts = await res.json();

    if (!Array.isArray(posts)) return [];
    return posts
      .filter((p: Record<string, unknown>) => p.postContent || p.text)
      .slice(0, 50)
      .map((p: Record<string, unknown>) => ({
        text: String(p.postContent ?? p.text ?? ""),
        url: String(p.postUrl ?? ""),
        date: String(p.postDate ?? p.postTimestamp ?? ""),
      }));
  } catch (err) {
    console.error("PhantomBuster scrape error:", err);
    return [];
  }
}
