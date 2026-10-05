import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function Auth() {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: data.user.id, username: username.toLowerCase(), display_name: displayName });
          if (profileError) throw profileError;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      await refreshProfile();
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card-soft w-full max-w-sm p-8">
        <h1 className="font-display text-3xl font-extrabold">Human</h1>
        <p className="mt-1 text-sm text-muted-foreground">Watch, post, and go live.</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === 'signup' && (
            <>
              <input
                className="w-full rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                pattern="[a-z0-9_]{3,24}"
                title="3-24 characters: lowercase letters, numbers, underscore"
                required
              />
              <input
                className="w-full rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </>
          )}
          <input
            type="email"
            className="w-full rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'signup' ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === 'signup' ? 'Already have an account? Log in' : "New here? Sign up"}
        </button>
      </div>
    </div>
  );
}
