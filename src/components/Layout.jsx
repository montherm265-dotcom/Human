import { NavLink, Outlet } from 'react-router-dom';
import { Home, Radio, PlusSquare, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { to: '/', label: 'Feed', icon: Home },
  { to: '/live', label: 'Live', icon: Radio },
  { to: '/post', label: 'Post', icon: PlusSquare },
];

export default function Layout() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/95 py-2 backdrop-blur">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`
            }
          >
            <Icon className="h-6 w-6" />
            {label}
          </NavLink>
        ))}
        <NavLink
          to={profile ? `/profile/${profile.username}` : '/auth'}
          className={({ isActive }) => `flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <User className="h-6 w-6" />
          )}
          Profile
        </NavLink>
      </nav>
    </div>
  );
}
