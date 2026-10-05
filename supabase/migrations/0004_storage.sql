-- Video uploads use Supabase Storage directly — this needs no third-party
-- provider, unlike live streaming (Cloudflare Stream), so it's real and
-- working today, not another honest placeholder.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

create policy "public read access to the videos bucket"
on storage.objects for select
using (bucket_id = 'videos');

create policy "users upload videos into their own folder"
on storage.objects for insert
with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own uploaded videos"
on storage.objects for delete
using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
