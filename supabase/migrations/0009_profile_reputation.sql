-- Reputation instead of a follower count: a real, computed signal from
-- actual engagement on actual videos — never a stored blurb, never
-- fabricated. Someone with 0 followers can still show up here if their
-- few videos are genuinely well-received; someone with a huge follower
-- count earns nothing from this function if their content isn't.
create or replace function public.get_profile_reputation(p_profile_id uuid)
returns jsonb
language sql security definer set search_path = public stable as $$
  with agg as (
    select
      count(*) as total_videos,
      coalesce(sum(like_count), 0) as total_likes,
      coalesce(sum(comment_count), 0) as total_comments
    from public.videos
    where creator_id = p_profile_id and status = 'ready'
  )
  select jsonb_build_object(
    'score', total_likes + total_comments * 2,
    'total_videos', total_videos,
    'total_likes', total_likes,
    'highlight', case
      when total_videos = 0 then null
      when total_likes >= 50 then 'Well-loved creator'
      when total_videos >= 5 then 'Active creator'
      else 'New here'
    end
  )
  from agg;
$$;
revoke execute on function public.get_profile_reputation(uuid) from public;
grant execute on function public.get_profile_reputation(uuid) to anon, authenticated;
