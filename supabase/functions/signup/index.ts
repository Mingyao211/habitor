// Public sign-up endpoint for Habitor's username + password accounts.
// It is the server-side equivalent of /auth/v1/signup, so it does not require a JWT:
// it validates its own input and creates an already-confirmed user with a hidden
// sign-in address, so no confirmation email is ever sent.
// Deployed with verify_jwt = false.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  const username = String(body.username ?? "").trim().toLowerCase().replace(/^@/, "");
  const password = body.password;
  const name = String(body.name ?? "").trim().slice(0, 30);
  const avatar = String(body.avatar ?? "🦊").slice(0, 8) || "🦊";
  const bio = String(body.bio ?? "").slice(0, 150);

  if (!/^[a-z0-9_]{3,20}$/.test(username)) return json({ error: "invalid_username" }, 400);
  if (typeof password !== "string" || password.length < 6 || password.length > 72) return json({ error: "weak_password" }, 400);
  if (!name) return json({ error: "invalid_name" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: taken, error: lookupError } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (lookupError) return json({ error: "server_error" }, 500);
  if (taken) return json({ error: "username_taken" }, 409);

  const email = `${crypto.randomUUID()}@users.habitor.app`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, name, avatar, bio },
  });
  if (error) {
    // the profile trigger fails on a duplicate username (a race with another sign-up)
    if (/database|duplicate|unique/i.test(error.message)) return json({ error: "username_taken" }, 409);
    if (/password/i.test(error.message)) return json({ error: "weak_password", detail: error.message }, 400);
    return json({ error: "create_failed" }, 500);
  }
  return json({ ok: true, email });
});
