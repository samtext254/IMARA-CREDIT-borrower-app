'use client';

import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/borrower/BottomNav';
import { DownloadAppButton } from '@/components/pwa/DownloadAppButton';
import { imara, ImaraApiError } from '@/lib/api';

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await imara.me();
        if (!cancelled) setAuthed(true);
      } catch (err) {
        if (cancelled) return;

        if (err instanceof ImaraApiError) {
          // The shared SessionWatcher will handle redirect on
          // session-death codes. We just stay in the loading state.
          // For a network error, we also stay in the loading state
          // so the user is not bounced to login unnecessarily.
        }
        // Do nothing — SessionWatcher handles the redirect.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // While checking, render a minimal skeleton so we do not flash
  // the page content to an unauthenticated user.
  if (checking) {
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-page">
        <main className="flex-1 pb-20 px-3 pt-3">
          <div className="h-44 animate-pulse rounded-3xl bg-ink-100/40" />
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-ink-100/40" />
        </main>
        <BottomNav />
      </div>
    );
  }

  // If the check failed, render nothing. The SessionWatcher will
  // have already routed the user to /session-expired.
  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-page">
        <main className="flex-1 pb-20" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-page">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
      <DownloadAppButton />
    </div>
  );
}