import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, UserCheck, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

function useVideoFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_video_feed', { p_limit: 20 });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function VideoCard({ video, isActive, muted, onToggleMute }) {
  const videoRef = useRef(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [following, setFollowing] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
      if (!viewedRef.current) {
        viewedRef.current = true;
        supabase.rpc('record_video_view', { p_video_id: video.id }).then(() => {});
      }
    } else {
      el.pause();
    }
  }, [isActive, video.id]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Log in to like videos');
      const { data, error } = await supabase.rpc('toggle_video_like', { p_video_id: video.id });
      if (error) throw error;
      return data;
    },
    onMutate: () => {
      setLiked((l) => !l);
      setLikeCount((c) => (liked ? c - 1 : c + 1));
    },
    onError: () => {
      setLiked((l) => !l);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Log in to follow');
      const { data, error } = await supabase.rpc('toggle_follow', { p_followee_id: video.creator_id });
      if (error) throw error;
      return data;
    },
    onMutate: () => setFollowing((f) => !f),
    onError: () => setFollowing((f) => !f),
  });

  return (
    <div className="relative flex h-screen w-full snap-start items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url}
        loop
        muted={muted}
        playsInline
        className="h-full w-full object-contain"
        onClick={() => (videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause())}
      />

      <button onClick={onToggleMute} className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 pb-6 text-white">
        <div className="max-w-[75%] space-y-1">
          <p className="font-display font-bold">@{video.creator_username}</p>
          {video.caption && <p className="text-sm text-white/90">{video.caption}</p>}
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => followMutation.mutate()}
            className="flex flex-col items-center gap-1"
            aria-label={following ? 'Unfollow' : 'Follow'}
          >
            {following ? <UserCheck className="h-7 w-7 text-primary" /> : <UserPlus className="h-7 w-7" />}
          </button>
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={() => likeMutation.mutate()}
            className="flex flex-col items-center gap-1"
            aria-label="Like"
          >
            <Heart className={`h-8 w-8 ${liked ? 'fill-primary text-primary' : ''}`} />
            <span className="text-xs font-semibold">{likeCount}</span>
          </motion.button>
          <div className="flex flex-col items-center gap-1 opacity-80">
            <MessageCircle className="h-7 w-7" />
            <span className="text-xs font-semibold">{video.comment_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Feed() {
  const { data: videos, isLoading, isError } = useVideoFeed();
  const [activeId, setActiveId] = useState(null);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    if (videos?.length && activeId === null) setActiveId(videos[0].id);
  }, [videos, activeId]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container) return;
    const center = container.scrollTop + container.clientHeight / 2;
    let closest = null;
    let closestDist = Infinity;
    for (const child of container.children) {
      const dist = Math.abs(child.offsetTop + child.clientHeight / 2 - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = child;
      }
    }
    if (closest?.dataset?.videoId) setActiveId(closest.dataset.videoId);
  }

  if (isLoading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (isError) return <div className="flex h-screen items-center justify-center text-muted-foreground">Couldn't load the feed.</div>;
  if (!videos?.length) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="font-display text-lg font-semibold text-foreground">No videos yet</p>
        <p className="text-sm">Be the first to post something.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="h-screen snap-y snap-mandatory overflow-y-scroll">
      {videos.map((video) => (
        <div key={video.id} data-video-id={video.id}>
          <VideoCard video={video} isActive={activeId === video.id} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
        </div>
      ))}
    </div>
  );
}
