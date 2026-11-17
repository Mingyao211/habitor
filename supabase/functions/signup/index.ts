// Public sign-up endpoint for Habitor accounts (username + email + password).
// It is the server-side equivalent of /auth/v1/signup, so it does not require a JWT:
// it validates its own input and creates an already-confirmed user that signs in with a
// hidden address, so no confirmation email is ever sent. The person's real email is kept
// privately in public.user_contact.
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
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
  const contact = String(body.email ?? "").trim();

  if (!/^[a-z0-9_]{3,20}$/.test(username)) return json({ error: "invalid_username" }, 400);
  if (typeof password !== "string" || password.length < 6 || password.length > 72) return json({ error: "weak_password" }, 400);
  if (!name) return json({ error: "invalid_name" }, 400);
  if (!EMAIL_RE.test(contact) || contact.length > 254) return json({ error: "invalid_email" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: taken, error: lookupError } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (lookupError) return json({ error: "server_error" }, 500);
  if (taken) return json({ error: "username_taken" }, 409);
  const { data: emailFree, error: emailError } = await admin.rpc("email_available", { e: contact });
  if (emailError) return json({ error: "server_error" }, 500);
  if (!emailFree) return json({ error: "email_taken" }, 409);

  const signin = `${crypto.randomUUID()}@users.habitor.app`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: signin,
    password,
    email_confirm: true,
    user_metadata: { username, name, avatar, bio },
  });
  if (error || !created.user) {
    // the profile trigger fails on a duplicate username (a race with another sign-up)
    if (error && /database|duplicate|unique/i.test(error.message)) return json({ error: "username_taken" }, 409);
    if (error && /password/i.test(error.message)) return json({ error: "weak_password", detail: error.message }, 400);
    return json({ error: "create_failed" }, 500);
  }
  const { error: contactError } = await admin.from("user_contact").insert({ user_id: created.user.id, email: contact });
  if (contactError) {
    // someone saved the same email a moment ago: undo this sign-up
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: contactError.code === "23505" ? "email_taken" : "create_failed" }, contactError.code === "23505" ? 409 : 500);
  }
  return json({ ok: true, email: signin });
});
