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

const MAX_SECONDS = 30;

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

    // Keep the search's relevance order; return the first that is <= 30s.
    for (const id of ids) {
      const item = (ddata.items ?? []).find((it) => it.id === id);
      if (!item) continue;
      const secs = iso8601ToSeconds(item.contentDetails?.duration);
      if (secs != null && secs > 0 && secs <= MAX_SECONDS) {
        return {
          video: {
            url: `https://youtu.be/${id}`,
            title: item.snippet?.title ?? name,
            seconds: secs,
          },
        };
      }
    }

    return { video: null, warning: "No demo 30 seconds or under was found." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Exercise Video Search Error]", msg);
    return { video: null, warning: "Video search failed." };
  }
}
