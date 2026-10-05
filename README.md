# Human

Watch, post, and go live.

## Stack

React + Vite + Tailwind CSS. Supabase (Postgres + Auth + Storage + RLS) for the backend — no other
third-party service is required for the core loop (posting and watching video uses Supabase Storage
directly, not an external CDN).

## Status

**Not yet connected to a live Supabase project.** The account's Supabase organization is at its 2-project
free-tier limit (already used by two other apps), so this repo's backend has never been provisioned or
tested against a real database. Everything below is written and ready — build and lint both pass — but
none of it has run against a live Postgres instance yet.

## The database, by file

| File | Contents |
|---|---|
| `0001_core_schema.sql` | profiles, videos, video_likes, video_comments, follows, blocks, reports, live_streams, live_chat_messages |
| `0002_functions_triggers.sql` | toggle_video_like/toggle_follow (RPC, not raw client writes, so counters can't be forged), trigger-maintained like/comment counts, record_video_view, get_video_feed, the live-stream lifecycle (start_/mark_live_/end_) |
| `0003_policies.sql` | RLS for every table |
| `0004_storage.sql` | the `videos` Storage bucket + per-user-folder upload policy |

## What's real vs. honestly not built yet

- **Posting and watching video**: real. Upload goes straight to Supabase Storage; no Cloudflare or other
  provider needed. This is the one flow built end-to-end for v1: sign up → post a video → see it in the feed →
  like / follow / comment.
- **Live streaming**: the schema and lifecycle functions are real, but actual video ingest needs
  Cloudflare Stream (or similar) credentials and an Edge Function to call it — exactly the same honesty
  pattern as Work's "Live Work" feature. "Go Live" creates a real `live_streams` row and says plainly that
  video can't flow yet, rather than faking it.
- **Feed ranking**: `get_video_feed()` is naive reverse-chronological. No engagement-based ranking —
  there's no engagement data yet to rank on, and shipping a fake "algorithm" before that exists would just
  be a random shuffle wearing a label.
- **Moderation**: reports table + RLS exist (admins can read/resolve); there's no admin UI yet, just the
  database-level primitive.
- **View counts**: a bare counter bump per `record_video_view()` call, not a per-view log. Nothing stops
  inflating it by replaying the call — worth a rate limit before this number is shown to anyone who'd act
  on it (e.g. advertisers), not before then.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in once a Supabase project exists
npm run dev
```

## Activating the backend

1. Free a slot in the Supabase org (pause/delete/upgrade) or create a new org, then create a project.
2. Apply the migrations in `supabase/migrations/` in order.
3. Copy `.env.example` to `.env.local` with the project's URL and anon/publishable key.
4. `npm install && npm run dev`.
