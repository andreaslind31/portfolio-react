interface Env {
  LEADERBOARD: KVNamespace;
}

interface ScoreEntry {
  name: string;
  score: number;
  date: string;
}

const VALID_GAMES = ["tetris", "wordle"] as const;
type Game = (typeof VALID_GAMES)[number];

const MAX_SCORES = 100;
const RETURN_LIMIT = 20;
const RATE_LIMIT_TTL = 60; // seconds (KV minimum is 60)

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function scoresKey(game: Game): string {
  return `scores:${game}`;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const kv = context.env.LEADERBOARD;
  if (!kv) {
    return json({ error: "Leaderboard not configured." }, 503);
  }

  // Parse game param (default to tetris for backward compat)
  const url = new URL(context.request.url);
  const gameParam = url.searchParams.get("game") || "tetris";
  if (!VALID_GAMES.includes(gameParam as Game)) {
    return json({ error: "Invalid game parameter." }, 400);
  }
  const game = gameParam as Game;

  try {
    const method = context.request.method;

    // GET — return top scores
    if (method === "GET") {
      let data = (await kv.get(scoresKey(game), "json")) as ScoreEntry[] | null;

      // Legacy fallback: if tetris scores are empty, try the old "scores" key
      if (!data && game === "tetris") {
        data = (await kv.get("scores", "json")) as ScoreEntry[] | null;
        // Migrate to new key if legacy data exists
        if (data) {
          await kv.put(scoresKey(game), JSON.stringify(data));
        }
      }

      const scores = (data || []).slice(0, RETURN_LIMIT);
      return new Response(JSON.stringify(scores), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });
    }

    // POST — submit a score
    if (method === "POST") {
      // Rate limit by IP per game
      const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";
      const rateKey = `rate:${game}:${ip}`;
      const lastSubmit = await kv.get(rateKey);
      if (lastSubmit) {
        return json(
          { error: "Too many submissions. Try again in a minute." },
          429
        );
      }

      // Parse & validate body
      let body: { name?: unknown; score?: unknown };
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Invalid JSON." }, 400);
      }

      const name =
        typeof body.name === "string" ? body.name.trim() : "";
      const score = body.score;

      if (name.length < 1 || name.length > 16) {
        return json({ error: "Name must be 1–16 characters." }, 400);
      }

      if (
        typeof score !== "number" ||
        !Number.isInteger(score) ||
        score <= 0
      ) {
        return json({ error: "Score must be a positive integer." }, 400);
      }

      // Set rate limit
      await kv.put(rateKey, "1", { expirationTtl: RATE_LIMIT_TTL });

      // Add score and keep top N
      const key = scoresKey(game);
      const data =
        ((await kv.get(key, "json")) as ScoreEntry[] | null) || [];
      data.push({
        name,
        score,
        date: new Date().toISOString().split("T")[0],
      });
      data.sort((a, b) => b.score - a.score);
      const trimmed = data.slice(0, MAX_SCORES);
      await kv.put(key, JSON.stringify(trimmed));

      return json({ ok: true });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return json({ error: message }, 500);
  }
};
