-- RLS policies for every table. Tables with no write policy for a role are
-- writable only through the SECURITY DEFINER functions in 0002, which is
-- what makes "counters are never trusted from the client" and "a stream
-- isn't live until the provider says so" actual guarantees.

create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "users insert their own profile" on public.profiles for insert with check (id = auth.uid());
create policy "users update their own profile" on public.profiles for update using (id = auth.uid());

create policy "ready videos are publicly readable" on public.videos for select
  using (status = 'ready' or creator_id = auth.uid());
create policy "users post their own videos" on public.videos for insert with check (creator_id = auth.uid());
create policy "creators update their own videos" on public.videos for update using (creator_id = auth.uid());
create policy "creators delete their own videos" on public.videos for delete using (creator_id = auth.uid());

create policy "likes are publicly readable" on public.video_likes for select using (true);
-- No insert/delete policy: only toggle_video_like() (SECURITY DEFINER) writes here.

create policy "comments are publicly readable" on public.video_comments for select using (true);
create policy "users post their own comments" on public.video_comments for insert
  with check (
    user_id = auth.uid()
    and not exists (
      select 1 from public.videos v where v.id = video_id and public.is_blocked_pair(auth.uid(), v.creator_id)
    )
  );
create policy "comment author or video owner can delete" on public.video_comments for delete
  using (user_id = auth.uid() or exists (select 1 from public.videos v where v.id = video_id and v.creator_id = auth.uid()));

create policy "follows are publicly readable" on public.follows for select using (true);
-- No insert/delete policy: only toggle_follow() (SECURITY DEFINER) writes here.

create policy "users see only their own blocks" on public.blocks for select using (blocker_id = auth.uid());
create policy "users create their own blocks" on public.blocks for insert with check (blocker_id = auth.uid());
create policy "users remove their own blocks" on public.blocks for delete using (blocker_id = auth.uid());

create policy "reporters and admins can read reports" on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());
create policy "authenticated users can file reports" on public.reports for insert with check (reporter_id = auth.uid());
create policy "admins can update reports" on public.reports for update using (public.is_admin());

create policy "live streams visible when live or to their creator" on public.live_streams for select
  using (status = 'live' or creator_id = auth.uid());
-- No insert policy: only start_live_stream() (SECURITY DEFINER) writes here,
-- so the one-active-stream-per-creator constraint can't be bypassed by a
-- direct client insert.

create policy "live chat readable when the stream is visible" on public.live_chat_messages for select
  using (exists (
    select 1 from public.live_streams ls where ls.id = live_stream_id and (ls.status = 'live' or ls.creator_id = auth.uid())
  ));
create policy "anyone who can see the stream can chat" on public.live_chat_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.live_streams ls
      where ls.id = live_stream_id and (ls.status = 'live' or ls.creator_id = auth.uid())
        and not public.is_blocked_pair(auth.uid(), ls.creator_id)
    )
  );
