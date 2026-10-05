-- Human core schema: short-form video + live streaming, general consumer.
-- v1 scope: post a video, scroll a feed, like/comment, follow, go live.
-- Safety primitives (blocks/reports) ship from day one, not bolted on later
-- — this is open UGC video for a general audience, so that's not optional.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 500),
  avatar_url text,
  is_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Videos. video_url/thumbnail_url are honest placeholders: a real upload +
-- transcode pipeline (Cloudflare Stream or similar) is infrastructure this
-- schema doesn't provision on its own — see the live-streaming section
-- below for the same honesty pattern applied to Go Live.
-- ---------------------------------------------------------------------------
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  caption text check (char_length(caption) <= 2000),
  video_url text not null,
  thumbnail_url text,
  duration_seconds numeric,
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  comment_count bigint not null default 0,
  created_at timestamptz not null default now()
);

create index videos_feed_idx on public.videos(created_at desc) where status = 'ready';
create index videos_creator_idx on public.videos(creator_id, created_at desc);
alter table public.videos enable row level security;

create table public.video_likes (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

alter table public.video_likes enable row level security;

create table public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index video_comments_video_idx on public.video_comments(video_id, created_at);
alter table public.video_comments enable row level security;

-- ---------------------------------------------------------------------------
-- Social graph & safety
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows(followee_id);
alter table public.follows enable row level security;

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'video', 'comment', 'live_stream')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

create index reports_status_idx on public.reports(status);
alter table public.reports enable row level security;

-- ---------------------------------------------------------------------------
-- Live streaming. Same honesty pattern as a video upload pipeline: this is
-- real DB plumbing for a real provider (Cloudflare Stream), not a fake
-- "Go Live" button — start_live_stream()/mark_live_stream_live()/
-- end_live_stream() in 0002 wire it up; it does nothing until
-- CLOUDFLARE_STREAM_* secrets exist and the ingest Edge Function is deployed.
-- ---------------------------------------------------------------------------
create table public.live_streams (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  provider text not null default 'cloudflare_stream' check (provider in ('cloudflare_stream')),
  provider_stream_id text,
  provider_playback_id text,
  playback_url text,
  status text not null default 'idle' check (status in ('idle', 'live', 'ended', 'failed')),
  viewer_count bigint not null default 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index live_streams_one_active on public.live_streams(creator_id) where status in ('idle', 'live');
alter table public.live_streams enable row level security;

create table public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  live_stream_id uuid not null references public.live_streams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index live_chat_stream_idx on public.live_chat_messages(live_stream_id, created_at);
alter table public.live_chat_messages enable row level security;
