'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AuthPage from '@/components/auth-page';
import Dashboard from '@/components/dashboard';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <AuthPage />;
}
