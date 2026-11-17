# Supabase backend

Project: `habitor` (ap-southeast-1). Schema, row level security, RPCs (`create_party`, `join_party`, `leave_party`, `username_available`) and realtime were applied as migrations `habitor_schema` and `move_helpers_private`.

Tables: profiles, user_state, daily_stats, parties, party_members, challenges, trophies, friendships, messages.

Accounts use username + password. Sign-up creates a hidden sign-in address `<random>@users.habitor.app`; `login_email(username)` returns it so the app can sign in by username (real email addresses are never returned). Sign-up goes through the `signup` edge function (`supabase/functions/signup`), which creates already-confirmed users, so no confirmation email is sent.

Emails: each account's real email is stored privately in `user_contact` (only its owner can read it). `login_email(username or email)` returns the hidden sign-in address, never the real email; `email_available(email)` checks for duplicates.
