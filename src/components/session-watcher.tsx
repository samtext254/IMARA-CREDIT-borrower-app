'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToSessionEnd } from '@/lib/session';

export function SessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = subscribeToSessionEnd((reason) => {
      router.replace(`/session-expired?reason=${reason}`);
    });
    return unsubscribe;
  }, [router]);

  return null;
}