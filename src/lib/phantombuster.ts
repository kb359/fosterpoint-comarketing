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

async function pollForOutput(
  agentId: string,
  containerId: string,
  timeoutMs = 120_000
): Promise<LinkedInPost[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const data = await pbRequest(
        `/agents/fetch-output?id=${agentId}&containerId=${containerId}`
      );
      // v2: exitMessage tells us the run status; resultObject holds the data
      const exitMessage = data.exitMessage ?? data.data?.exitMessage;
      const isDone = exitMessage === "finished" || exitMessage === "killed" ||
        exitMessage === "global timeout" || exitMessage === "agent timeout";
      if (isDone) {
        const raw = data.resultObject ?? data.data?.resultObject ?? [];
        let output = raw;
        // resultObject may be a JSON string
        if (typeof raw === "string") {
          try { output = JSON.parse(raw); } catch { output = []; }
        }
        if (Array.isArray(output)) {
          return output
            .filter((p: Record<string, unknown>) => p.postContent || p.text)
            .slice(0, 50)
            .map((p: Record<string, unknown>) => ({
              text: String(p.postContent ?? p.text ?? ""),
              url: String(p.postUrl ?? ""),
              date: String(p.postDate ?? p.postTimestamp ?? ""),
            }));
        }
        return [];
      }
    } catch {
      // keep polling
    }
  }
  return [];
}

export async function scrapeLinkedInPosts(
  profileUrl: string
): Promise<LinkedInPost[]> {
  const apiKey = process.env.PHANTOMBUSTER_API_KEY;
  if (!apiKey) return [];

  const agentId = LINKEDIN_ACTIVITY_EXTRACTOR_ID;

  try {
    const launch = await pbRequest("/agents/launch", {
      method: "POST",
      body: JSON.stringify({
        id: agentId,
        // argument must be a JSON string, not an object
        argument: JSON.stringify({
          profileUrls: profileUrl,
          activitiesToScrape: ["Post"],
          numberMaxOfPosts: 50,
          numberOfLinesPerLaunch: 1,
        }),
      }),
    });

    const containerId = launch.containerId ?? launch.data?.containerId;
    if (!containerId) return [];

    return await pollForOutput(agentId, containerId);
  } catch (err) {
    console.error("PhantomBuster scrape error:", err);
    return [];
  }
}
