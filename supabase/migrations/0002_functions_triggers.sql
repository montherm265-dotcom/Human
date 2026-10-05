-- Human business logic: counters stay correct via triggers (never trusted
-- from the client), blocks are enforced at the function level (not just a
-- UI filter), and the live-stream lifecycle separates "the creator asked to
-- go live" from "the provider confirmed it's actually live" the same way
-- Work's workroom-live pattern does.

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;

create or replace function public.is_blocked_pair(p_a uuid, p_b uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- ---------------------------------------------------------------------------
-- Likes: toggle + trigger-maintained counter (never trust a client-sent count)
-- ---------------------------------------------------------------------------
create or replace function public.toggle_video_like(p_video_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_existing boolean;
begin
  select exists (select 1 from public.video_likes where video_id = p_video_id and user_id = auth.uid()) into v_existing;
  if v_existing then
    delete from public.video_likes where video_id = p_video_id and user_id = auth.uid();
    return false;
  else
    insert into public.video_likes (video_id, user_id) values (p_video_id, auth.uid());
    return true;
  end if;
end;
$$;

create or replace function public.on_video_like_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.videos set like_count = like_count + 1 where id = new.video_id;
  elsif tg_op = 'DELETE' then
    update public.videos set like_count = greatest(0, like_count - 1) where id = old.video_id;
  end if;
  return null;
end;
$$;
create trigger video_likes_count after insert or delete on public.video_likes
  for each row execute function public.on_video_like_change();

-- ---------------------------------------------------------------------------
-- Comments: client inserts/deletes directly (see RLS in 0003); counter is
-- trigger-maintained the same way as likes.
-- ---------------------------------------------------------------------------
create or replace function public.on_video_comment_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.videos set comment_count = comment_count + 1 where id = new.video_id;
  elsif tg_op = 'DELETE' then
    update public.videos set comment_count = greatest(0, comment_count - 1) where id = old.video_id;
  end if;
  return null;
end;
$$;
create trigger video_comments_count after insert or delete on public.video_comments
  for each row execute function public.on_video_comment_change();

-- ---------------------------------------------------------------------------
-- Views: a bare counter bump, not a per-view log table — v1 keeps this
-- simple on purpose. Known limitation: nothing stops a user from inflating
-- a view count by replaying this call; worth a rate limit before this
-- number is ever shown to advertisers, not before then.
-- ---------------------------------------------------------------------------
create or replace function public.record_video_view(p_video_id uuid)
returns void
language sql security definer set search_path = public as $$
  update public.videos set view_count = view_count + 1 where id = p_video_id and status = 'ready';
$$;

-- ---------------------------------------------------------------------------
-- Follow graph
-- ---------------------------------------------------------------------------
create or replace function public.toggle_follow(p_followee_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_existing boolean;
begin
  if p_followee_id = auth.uid() then raise exception 'cannot follow yourself'; end if;
  if public.is_blocked_pair(auth.uid(), p_followee_id) then raise exception 'unable to follow this user'; end if;

  select exists (select 1 from public.follows where follower_id = auth.uid() and followee_id = p_followee_id) into v_existing;
  if v_existing then
    delete from public.follows where follower_id = auth.uid() and followee_id = p_followee_id;
    return false;
  else
    insert into public.follows (follower_id, followee_id) values (auth.uid(), p_followee_id);
    return true;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Feed: naive reverse-chronological v1 — no ranking algorithm yet. Excludes
-- videos from anyone in a block relationship with the viewer and anyone
-- suspended/banned. This is the thing to upgrade first once there's real
-- engagement data; shipping a fake "algorithm" before that data exists
-- would just be a random shuffle wearing a label.
-- ---------------------------------------------------------------------------
create or replace function public.get_video_feed(p_limit integer default 10, p_before timestamptz default null)
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
  where v.status = 'ready'
    and p.status = 'active'
    and (p_before is null or v.created_at < p_before)
    and (auth.uid() is null or not public.is_blocked_pair(auth.uid(), v.creator_id))
  order by v.created_at desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- Live streaming lifecycle. start_/end_ are the creator's own actions;
-- mark_live_stream_live is the provider's confirmation and is restricted to
-- service_role below — a client telling the database "I'm live now" with no
-- provider involved would make the live badge meaningless.
-- ---------------------------------------------------------------------------
create or replace function public.start_live_stream(p_title text)
returns public.live_streams
language plpgsql security definer set search_path = public as $$
declare
  v_row public.live_streams;
begin
  insert into public.live_streams (creator_id, title) values (auth.uid(), p_title) returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.mark_live_stream_live(p_stream_id uuid, p_provider_stream_id text, p_provider_playback_id text, p_playback_url text default null)
returns public.live_streams
language plpgsql security definer set search_path = public as $$
declare
  v_row public.live_streams;
begin
  update public.live_streams
  set status = 'live', started_at = now(), provider_stream_id = p_provider_stream_id,
      provider_playback_id = p_provider_playback_id, playback_url = p_playback_url
  where id = p_stream_id returning * into v_row;
  return v_row;
end;
$$;
-- Postgres grants EXECUTE to the PUBLIC pseudo-role by default on function
-- creation; every role implicitly has whatever PUBLIC is granted
-- regardless of its own specific grants, so PUBLIC is what must be
-- revoked here, not anon/authenticated individually.
revoke execute on function public.mark_live_stream_live(uuid, text, text, text) from public;

create or replace function public.end_live_stream(p_stream_id uuid)
returns public.live_streams
language plpgsql security definer set search_path = public as $$
declare
  v_row public.live_streams;
begin
  select * into v_row from public.live_streams where id = p_stream_id;
  if v_row.creator_id <> auth.uid() then raise exception 'only the host can end this stream'; end if;
  update public.live_streams set status = 'ended', ended_at = now() where id = p_stream_id returning * into v_row;
  return v_row;
end;
$$;
