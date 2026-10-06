'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Detect environments where PWA install is impossible or unlikely.
 * If so, we hide the button rather than showing an alert on tap.
 */
function isInstallUnlikely(): boolean {
  if (typeof window === 'undefined') return true;

  // ── Reliable feature detection (checked first) ───────────────────────
  // The `beforeinstallprompt` event exists on `window` only in browsers
  // that support PWA install. Chrome < 108, Chrome 101 on Android 8.1,
  // and many older OEM browsers do NOT have it.
  if (!('onbeforeinstallprompt' in window)) return true;

  const ua = window.navigator.userAgent;

  // In-app browsers (Facebook, Instagram, WhatsApp, Twitter, LinkedIn…)
  const inApp =
    /FBAN|FBAV|Instagram|Twitter|Line|WhatsApp|LinkedIn|Snapchat/i.test(ua);
  if (inApp) return true;

  // Samsung Internet and other non-Chromium-based Android browsers
  const samsung = /SamsungBrowser/i.test(ua);
  if (samsung) return true;

  // Firefox on Android — no PWA install
  const firefoxAndroid = /Firefox/i.test(ua) && /Android/i.test(ua);
  if (firefoxAndroid) return true;

  // ── Old Chrome on Android (pre-108) ───────────────────────────────────
  // Chrome 108 introduced the current PWA install criteria. Older versions
  // may fail to launch installed PWAs due to a shorter launch timeout and
  // buggy start_url handling. We hide the button on these.
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  if (chromeMatch) {
    const major = parseInt(chromeMatch[1], 10);
    if (major < 108) return true;
  }

  return false;
}

/**
 * Floating corner "Download app" pill with slide-up animation.
 *
 * - Modern Android Chrome / Edge: shows after `beforeinstallprompt` fires.
 * - iOS Safari: shows with a "Share → Add to Home Screen" hint.
 * - Everything else (old Chrome, Samsung Internet, in-app browsers,
 *   Firefox Android): hidden entirely — no button, no alert, no failure.
 * - Already installed: hidden.
 * - Dismissable per session.
 */
export function DownloadAppButton({
  variant = 'corner',
  className = '',
}: {
  variant?: 'corner' | 'primary' | 'secondary';
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already installed → hide
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS specific
      window.navigator.standalone === true;
    if (standalone) return;

    // Respect session dismiss
    if (sessionStorage.getItem('imara.pwa.dismissed') === '1') {
      setDismissed(true);
      return;
    }

    // Unsupported browsers → hide (this now catches old Chrome too)
    if (isInstallUnlikely()) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    setIsIOS(ios);

    // iOS: show the hint, no event will fire
    if (ios) {
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }

    // Modern Chrome/Edge: wait for the deferred prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem('imara.pwa.dismissed', '1');
    setDismissed(true);
    setVisible(false);
  }

  async function onClick() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setVisible(false);
      setDeferred(null);
      return;
    }
    if (isIOS) {
      alert(
        'On iPhone/iPad: tap the Share button, then "Add to Home Screen".'
      );
    }
  }

  if (dismissed) return null;

  /* ------------------------------------------------------------------ */
  /*  Corner floating pill (default)                                     */
  /* ------------------------------------------------------------------ */
  if (variant === 'corner') {
    return (
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-end px-3 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        } transition-all duration-500 ease-out ${className}`}
        aria-hidden={!visible}
      >
        <div className="pointer-events-auto relative">
          <button
            onClick={onClick}
            className="group flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-[12.5px] font-bold tracking-tight text-plum-800 shadow-[0_12px_28px_-8px_rgba(255,206,7,0.7)] transition active:scale-95"
          >
            <Download
              size={15}
              strokeWidth={2.6}
              className="transition group-active:translate-y-0.5"
            />
            {isIOS ? 'Add to Home Screen' : 'Install app'}
          </button>

          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-plum-800 text-white shadow-md ring-1 ring-white/20 transition active:scale-90"
          >
            <X size={10} strokeWidth={2.8} />
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Legacy inline button (landing page)                                */
  /* ------------------------------------------------------------------ */
  if (!visible) return null;

  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[13.5px] font-bold tracking-tight transition active:scale-[0.985]';
  const styles =
    variant === 'primary'
      ? 'bg-brand-500 text-plum-800 shadow-[0_10px_28px_-10px_rgba(255,206,7,0.6)]'
      : 'bg-white/10 text-white ring-1 ring-white/15';

  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      <Download size={16} strokeWidth={2.5} />
      {isIOS ? 'Add to Home Screen' : 'Download app'}
    </button>
  );
}