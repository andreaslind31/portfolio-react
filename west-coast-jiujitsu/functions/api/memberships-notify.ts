interface Env {
  MEMBERSHIPS: KVNamespace;
}

interface Membership {
  id: string;
  name: string;
  email: string;
  phone: string;
  beltRank: string;
  plan: string;
  membershipSince: string;
  expirationDate: string;
  notes: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

// GET - Returns members whose memberships are expiring within a given threshold
// Query params: ?days=30 (default 30)
// This endpoint can be called by a Cloudflare Cron Trigger or external service
// to power email/SMS notifications.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const daysParam = url.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  if (isNaN(days) || days < 0 || days > 365) {
    return json({ error: "Days must be between 0 and 365" }, 400);
  }

  const data = await env.MEMBERSHIPS.get("memberships");
  if (!data) {
    return json({ expiring: [], expired: [], summary: { expiring: 0, expired: 0 } });
  }

  const memberships = JSON.parse(data) as Membership[];
  const now = new Date();

  const expiring: (Membership & { daysLeft: number })[] = [];
  const expired: (Membership & { daysOverdue: number })[] = [];

  for (const member of memberships) {
    const expiry = new Date(member.expirationDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      expired.push({ ...member, daysOverdue: Math.abs(daysUntilExpiry) });
    } else if (daysUntilExpiry <= days) {
      expiring.push({ ...member, daysLeft: daysUntilExpiry });
    }
  }

  // Sort: most urgent first
  expiring.sort((a, b) => a.daysLeft - b.daysLeft);
  expired.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return json({
    expiring,
    expired,
    summary: {
      expiring: expiring.length,
      expired: expired.length,
    },
    checkedAt: now.toISOString(),
  });
};
