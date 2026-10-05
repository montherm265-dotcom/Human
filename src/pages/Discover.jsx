import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Radio, Video, Users, Shuffle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function useDiscoverStats() {
  return useQuery({
    queryKey: ['discover-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_discover_stats');
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });
}

function StatCard({ icon: Icon, value, label, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="card-soft flex flex-col items-center gap-2 p-5 text-center"
    >
      <Icon className="h-5 w-5 text-primary" />
      <motion.span
        key={value}
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        className="font-display text-3xl font-extrabold tabular-nums"
      >
        {value ?? 0}
      </motion.span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </motion.div>
  );
}

export default function Discover() {
  const { data: stats } = useDiscoverStats();
  const navigate = useNavigate();

  const meetSomeone = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('get_random_video');
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (video) => {
      if (video) navigate('/watch', { state: { entryVideo: video } });
    },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-4xl font-extrabold tracking-tight"
      >
        What's happening <span className="text-primary">right now</span>
      </motion.h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Every number below is real. Human is early — you're seeing it before almost anyone else.
      </p>

      <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-3">
        <StatCard icon={Radio} value={stats?.humans_live} label="live now" delay={0.05} />
        <StatCard icon={Video} value={stats?.videos_today} label="posted today" delay={0.12} />
        <StatCard icon={Users} value={stats?.total_creators} label="creators" delay={0.19} />
      </div>

      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/watch')}
          className="btn-primary w-full justify-between px-6 py-4 text-base shadow-glow"
        >
          Enter
          <ArrowRight className="h-5 w-5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => meetSomeone.mutate()}
          disabled={meetSomeone.isPending}
          className="btn-outline w-full justify-between px-6 py-4 text-base"
        >
          Meet someone
          <Shuffle className="h-5 w-5" />
        </motion.button>
      </div>

      {meetSomeone.isError && (
        <p className="mt-4 text-sm text-muted-foreground">No one to meet yet — be the first to post.</p>
      )}
    </div>
  );
}
