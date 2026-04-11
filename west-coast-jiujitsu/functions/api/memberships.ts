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
  createdAt: string;
  updatedAt: string;
}

const KV_KEY = "memberships";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function getMemberships(kv: KVNamespace): Promise<Membership[]> {
  const data = await kv.get(KV_KEY);
  if (!data) return [];
  return JSON.parse(data) as Membership[];
}

async function saveMemberships(kv: KVNamespace, memberships: Membership[]) {
  await kv.put(KV_KEY, JSON.stringify(memberships));
}

function validateMembership(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return "Name is required";
  }
  if (body.name.length > 100) {
    return "Name must be 100 characters or less";
  }
  if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
    return "Valid email is required";
  }
  if (!body.membershipSince || typeof body.membershipSince !== "string") {
    return "Membership since date is required";
  }
  if (!body.expirationDate || typeof body.expirationDate !== "string") {
    return "Expiration date is required";
  }
  const validPlans = ["monthly", "3-months", "6-months", "annual", "drop-in"];
  if (!body.plan || !validPlans.includes(body.plan as string)) {
    return "Valid plan is required";
  }
  const validBelts = ["white", "blue", "purple", "brown", "black"];
  if (!body.beltRank || !validBelts.includes(body.beltRank as string)) {
    return "Valid belt rank is required";
  }
  return null;
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

// GET - List all memberships
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const memberships = await getMemberships(env.MEMBERSHIPS);
  return json(memberships);
};

// POST - Create a new membership
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const validationError = validateMembership(body);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const memberships = await getMemberships(env.MEMBERSHIPS);
  const now = new Date().toISOString();

  const newMembership: Membership = {
    id: `mbr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: (body.name as string).trim(),
    email: (body.email as string).trim().toLowerCase(),
    phone: ((body.phone as string) || "").trim(),
    beltRank: body.beltRank as string,
    plan: body.plan as string,
    membershipSince: body.membershipSince as string,
    expirationDate: body.expirationDate as string,
    notes: ((body.notes as string) || "").trim(),
    createdAt: now,
    updatedAt: now,
  };

  memberships.push(newMembership);
  await saveMemberships(env.MEMBERSHIPS, memberships);

  return json(newMembership, 201);
};

// PUT - Update an existing membership
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.id || typeof body.id !== "string") {
    return json({ error: "Membership ID is required" }, 400);
  }

  const validationError = validateMembership(body);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const memberships = await getMemberships(env.MEMBERSHIPS);
  const index = memberships.findIndex((m) => m.id === body.id);

  if (index === -1) {
    return json({ error: "Membership not found" }, 404);
  }

  memberships[index] = {
    ...memberships[index],
    name: (body.name as string).trim(),
    email: (body.email as string).trim().toLowerCase(),
    phone: ((body.phone as string) || "").trim(),
    beltRank: body.beltRank as string,
    plan: body.plan as string,
    membershipSince: body.membershipSince as string,
    expirationDate: body.expirationDate as string,
    notes: ((body.notes as string) || "").trim(),
    updatedAt: new Date().toISOString(),
  };

  await saveMemberships(env.MEMBERSHIPS, memberships);

  return json(memberships[index]);
};

// DELETE - Remove a membership
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return json({ error: "Membership ID is required" }, 400);
  }

  const memberships = await getMemberships(env.MEMBERSHIPS);
  const index = memberships.findIndex((m) => m.id === id);

  if (index === -1) {
    return json({ error: "Membership not found" }, 404);
  }

  const removed = memberships.splice(index, 1)[0];
  await saveMemberships(env.MEMBERSHIPS, memberships);

  return json({ success: true, removed });
};
