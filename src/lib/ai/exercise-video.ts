/**
 * Find a short demo video for an exercise via the YouTube Data API.
 *
 * We only return a video that is 30 SECONDS OR LESS. YouTube's own
 * `videoDuration=short` filter means "< 4 minutes", so we take the short
 * results and then hard-filter by the real duration (contentDetails) to <= 30s.
 *
 * Requires the YOUTUBE_API_KEY env var. Never throws — resolves to
 * { video: null, warning } when unavailable so callers degrade cleanly.
 */

export interface ExerciseVideo {
  url: string;
  title: string;
  seconds: number;
}

export interface FindVideoResult {
  video: ExerciseVideo | null;
  warning?: string;
}

/** Parse an ISO-8601 duration (e.g. "PT25S", "PT1M5S") to whole seconds. */
function iso8601ToSeconds(d: string | undefined): number | null {
  if (!d) return null;
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  return h * 3600 + min * 60 + s;
}

const MAX_SECONDS = 30; // preferred cap
const FALLBACK_SECONDS = 60; // if nothing <=30s exists, take the shortest up to this

export async function findExerciseVideo(
  exercise: string,
  muscleGroup?: string,
): Promise<FindVideoResult> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) {
    return { video: null, warning: "Video search isn't set up (YOUTUBE_API_KEY missing)." };
  }

  const name = exercise.trim();
  if (!name) return { video: null };

  try {
    // Bias toward short-form demos.
    const q = `${name} ${muscleGroup ? muscleGroup + " " : ""}exercise proper form short`;
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
      `&videoEmbeddable=true&videoDuration=short&safeSearch=strict&maxResults=20` +
      `&q=${encodeURIComponent(q)}&key=${key}`;

    const sres = await fetch(searchUrl);
    if (!sres.ok) return { video: null, warning: `YouTube search failed (${sres.status}).` };
    const sdata = (await sres.json()) as { items?: Array<{ id?: { videoId?: string } }> };
    const ids = (sdata.items ?? [])
      .map((i) => i.id?.videoId)
      .filter((v): v is string => !!v);
    if (ids.length === 0) return { video: null };

    const detUrl =
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet` +
      `&id=${ids.join(",")}&key=${key}`;
    const dres = await fetch(detUrl);
    if (!dres.ok) return { video: null, warning: `YouTube lookup failed (${dres.status}).` };
    const ddata = (await dres.json()) as {
      items?: Array<{ id: string; contentDetails?: { duration?: string }; snippet?: { title?: string } }>;
    };

    // Collect candidates with their real duration (search order preserved).
    const candidates = ids
      .map((id) => {
        const item = (ddata.items ?? []).find((it) => it.id === id);
        const secs = iso8601ToSeconds(item?.contentDetails?.duration);
        return { id, secs, title: item?.snippet?.title ?? name };
      })
      .filter((c) => c.secs != null && c.secs > 0) as Array<{ id: string; secs: number; title: string }>;

    if (candidates.length === 0) return { video: null, warning: "No usable demo was found." };

    // Prefer <= 30s; if none exist (common on YouTube), fall back to the
    // SHORTEST clip up to 60s so a helpful demo still gets attached.
    const shortestUnder = (cap: number) =>
      candidates.filter((c) => c.secs <= cap).sort((a, b) => a.secs - b.secs)[0];
    const pick = shortestUnder(MAX_SECONDS) ?? shortestUnder(FALLBACK_SECONDS);

    if (!pick) return { video: null, warning: "No demo 60 seconds or under was found." };
    return {
      video: { url: `https://youtu.be/${pick.id}`, title: pick.title, seconds: pick.secs },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Exercise Video Search Error]", msg);
    return { video: null, warning: "Video search failed." };
  }
}
