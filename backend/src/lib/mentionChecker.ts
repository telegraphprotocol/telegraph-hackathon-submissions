import { env } from "../env.js";

/** Returns the mention count for an X username, or null if the lookup fails
 * (unknown account, mention-checker-api down, etc.) — never blocks submission. */
export async function fetchTweetMentionCount(username: string): Promise<number | null> {
  try {
    const res = await fetch(`${env.mentionCheckerBaseUrl}/mentions/${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { mentionCount?: number };
    return typeof data.mentionCount === "number" ? data.mentionCount : null;
  } catch {
    return null;
  }
}
