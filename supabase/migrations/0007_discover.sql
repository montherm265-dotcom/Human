-- Real counts for the Discover screen. These will honestly be small right
-- now — that's correct. The point is the UI pattern is right and the
-- numbers grow as real people show up, never fabricated to look bigger.
create or replace function public.get_discover_stats()
returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'humans_live', (select count(*) from public.live_streams where status = 'live'),
    'videos_today', (select count(*) from public.videos where status = 'ready' and created_at >= now() - interval '24 hours'),
    'total_creators', (select count(distinct creator_id) from public.videos where status = 'ready')
  );
$$;

create or replace function public.get_random_video()
returns table (
  id uuid, creator_id uuid, creator_username citext, creator_display_name text, creator_avatar_url text,
  caption text, video_url text, thumbnail_url text, duration_seconds numeric,
  view_count bigint, like_count bigint, comment_count bigint, created_at timestamptz
)
language sql security definer set search_path = public stable as $$
  select v.id, v.creator_id, p.username, p.display_name, p.avatar_url,
         v.caption, v.video_url, v.thumbnail_url, v.duration_seconds,
         v.view_count, v.like_count, v.comment_count, v.created_at
  from public.videos v
  join public.profiles p on p.id = v.creator_id
  where v.status = 'ready' and p.status = 'active'
  order by random()
  limit 1;
$$;
