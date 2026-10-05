import { useQuery, useMutation } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function Live() {
  const { user } = useAuth();

  const { data: streams } = useQuery({
    queryKey: ['live-streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('id, title, viewer_count, creator_id, profiles:creator_id(username, display_name, avatar_url)')
        .eq('status', 'live')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const goLive = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('start_live_stream', { p_title: `${user?.email}'s stream` });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-lg p-6 pt-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Live now</h1>
        <button onClick={() => goLive.mutate()} className="btn-outline text-sm">
          <Radio className="h-4 w-4 text-live" /> Go live
        </button>
      </div>

      {goLive.isSuccess && (
        <p className="mt-3 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
          Stream created — but actual video ingest needs Cloudflare Stream credentials that aren't configured yet. The
          database side is real and ready; this just can't carry real video until those secrets are set.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {streams?.map((s) => (
          <div key={s.id} className="card-soft flex items-center gap-3 p-3">
            <div className="relative">
              {s.profiles?.avatar_url ? (
                <img src={s.profiles.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-secondary" />
              )}
              <span className="live-badge absolute -bottom-1 left-1/2 -translate-x-1/2">Live</span>
            </div>
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-muted-foreground">@{s.profiles?.username} · {s.viewer_count} watching</p>
            </div>
          </div>
        ))}
        {streams?.length === 0 && <p className="text-center text-sm text-muted-foreground">No one is live right now.</p>}
      </div>
    </div>
  );
}
