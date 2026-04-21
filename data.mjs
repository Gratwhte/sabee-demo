import { getStore } from "@netlify/blobs";

const STORE_NAME = "sabee-store";
const DATA_KEY = "team-data";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache, no-store, must-revalidate"
};

const EMPTY = { members: [], daysOff: [], _ts: 0 };

export default async (req, context) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  const store = getStore({ name: STORE_NAME, siteID: context.site.id });

  // ---- GET: return current shared data ----
  if (req.method === "GET") {
    try {
      const raw = await store.get(DATA_KEY);
      if (!raw) {
        return new Response(JSON.stringify(EMPTY), { status: 200, headers });
      }
      return new Response(raw, { status: 200, headers });
    } catch (e) {
      console.error("GET error:", e);
      return new Response(JSON.stringify(EMPTY), { status: 200, headers });
    }
  }

  // ---- PUT: save data with timestamp ----
  if (req.method === "PUT") {
    try {
      const body = await req.json();

      if (!body || !Array.isArray(body.members)) {
        return new Response(
          JSON.stringify({ error: "Invalid data: members array required" }),
          { status: 400, headers }
        );
      }

      // Basic optimistic concurrency check
      let current = null;
      try {
        const raw = await store.get(DATA_KEY);
        if (raw) current = JSON.parse(raw);
      } catch (_) {}

      let conflict = false;
      if (current && body._ts && current._ts && body._ts < current._ts) {
        conflict = true;
      }

      const doc = {
        members: body.members,
        daysOff: body.daysOff || [],
        _ts: Date.now()
      };

      await store.set(DATA_KEY, JSON.stringify(doc));

      return new Response(
        JSON.stringify({ ok: true, conflict, _ts: doc._ts }),
        { status: 200, headers }
      );
    } catch (e) {
      console.error("PUT error:", e);
      return new Response(
        JSON.stringify({ error: "Save failed" }),
        { status: 500, headers }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers }
  );
};

export const config = {
  path: "/api/data"
};
