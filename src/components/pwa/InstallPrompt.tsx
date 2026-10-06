'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Custom PWA install prompt.
 *
 * - Android / Chrome / Edge: captures the browser `beforeinstallprompt`
 *   event and shows our own button.
 * - iOS Safari: no install event exists, so we show a small "how to"
 *   hint pointing at the Share menu.
 * - If the app is already installed (display-mode: standalone), we
 *   render nothing.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed? Hide.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS Safari specific
      window.navigator.standalone === true;
    if (standalone) return;

    // Respect a "don't ask again" for this session
    if (sessionStorage.getItem('imara.pwa.dismissed') === '1') {
      setDismissed(true);
      return;
    }

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    setIsIOS(ios);

    if (ios) {
      // Show the iOS-specific hint
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem('imara.pwa.dismissed', '1');
    setDismissed(true);
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
    }
    setDeferred(null);
  }

  if (!visible || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[26rem] overflow-hidden rounded-2xl bg-plum-800 text-white shadow-[0_18px_40px_-12px_rgba(63,31,99,0.7)] ring-1 ring-white/10">
      <div className="flex items-start gap-3 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-plum-800">
          <Download size={18} strokeWidth={2.4} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold tracking-tight">
            Install IMARA CREDIT
          </p>
          {isIOS ? (
            <p className="mt-0.5 text-[11.5px] leading-snug text-white/70">
              Tap <span className="font-semibold text-brand-500">Share</span>,
              then <span className="font-semibold text-brand-500">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-[11.5px] leading-snug text-white/70">
              Get the full app experience — offline-ready, faster.
            </p>
          )}

          {!isIOS && (
            <button
              onClick={install}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-[12px] font-bold text-plum-800 transition active:scale-95"
            >
              <Download size={13} strokeWidth={2.6} />
              Install app
            </button>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-white/70 transition active:scale-95"
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}