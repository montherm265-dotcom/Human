import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import Layout from '@/components/Layout';
import Feed from '@/pages/Feed';

const Auth = lazy(() => import('@/pages/Auth'));
const Live = lazy(() => import('@/pages/Live'));
const Post = lazy(() => import('@/pages/Post'));
const Profile = lazy(() => import('@/pages/Profile'));
const PageNotFound = lazy(() => import('@/pages/PageNotFound'));

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Feed />} />
                <Route path="/live" element={<Live />} />
                <Route path="/post" element={<RequireAuth><Post /></RequireAuth>} />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="*" element={<PageNotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}
