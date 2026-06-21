'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';

export default function IndexPage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.push('/login');
    } else {
      // Check if user has completed onboarding profile
      if (user?.profile || (user && user.profile)) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    }
  }, [session, loading, user, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '85vh',
      color: 'var(--text-secondary)',
      fontSize: '1.1rem',
      background: '#070a0e',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.75rem', color: '#10b981' }}>EcoAI Connecting...</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Verifying Supabase user session credentials...</p>
      </div>
    </div>
  );
}
