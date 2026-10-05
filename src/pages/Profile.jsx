import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: videos } = useQuery({
    queryKey: ['profile-videos', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('id, thumbnail_url, video_url, view_count')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('toggle_follow', { p_followee_id: profile.id });
      if (error) throw error;
      return data;
    },
    onMutate: () => setFollowing((f) => !f),
    onError: () => setFollowing((f) => !f),
  });

  if (!profile) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="mx-auto max-w-lg p-6 pt-10">
      <div className="flex flex-col items-center gap-3 text-center">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-secondary" />
        )}
        <div>
          <p className="font-display text-xl font-bold">{profile.display_name}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
        {profile.bio && <p className="max-w-sm text-sm text-muted-foreground">{profile.bio}</p>}
        {!isOwnProfile && (
          <button onClick={() => followMutation.mutate()} className="btn-primary">
            {following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-1.5">
        {videos?.map((v) => (
          <div key={v.id} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-secondary">
            <video src={v.video_url} poster={v.thumbnail_url} className="h-full w-full object-cover" muted />
            <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-xs text-white">
              <Play className="h-3 w-3 fill-white" /> {v.view_count}
            </div>
          </div>
        ))}
        {videos?.length === 0 && <p className="col-span-3 text-center text-sm text-muted-foreground">No posts yet.</p>}
      </div>
    </div>
  );
}
