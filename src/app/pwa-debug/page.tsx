'use client';

import { useEffect, useState } from 'react';

export default function PWADebugPage() {
  const [info, setInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    const checks: Record<string, string> = {};

    checks.userAgent = navigator.userAgent;

    checks.standalone =
      window.matchMedia('(display-mode: standalone)').matches
        ? 'YES'
        : 'NO';

    checks.navigatorStandalone =
      'standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone
        ? 'YES'
        : 'NO';

    checks.serviceWorker =
      'serviceWorker' in navigator ? 'SUPPORTED' : 'NOT SUPPORTED';

    checks.online = navigator.onLine ? 'ONLINE' : 'OFFLINE';

    checks.location = window.location.href;

    checks.manifest = 'Checking...';

    setInfo(checks);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          setInfo((old) => ({
            ...old,
            serviceWorkers: String(registrations.length),
            serviceWorkerScopes:
              registrations.length > 0
                ? registrations
                    .map((r) => r.scope)
                    .join('\n')
                : 'NONE',
          }));
        })
        .catch((error) => {
          setInfo((old) => ({
            ...old,
            serviceWorkerError: String(error),
          }));
        });
    }

    fetch('/manifest.json', { cache: 'no-store' })
      .then((response) => {
        setInfo((old) => ({
          ...old,
          manifest:
            response.ok
              ? `OK (${response.status})`
              : `FAILED (${response.status})`,
        }));
      })
      .catch((error) => {
        setInfo((old) => ({
          ...old,
          manifest: `ERROR: ${String(error)}`,
        }));
      });

    const handleError = (event: ErrorEvent) => {
      setInfo((old) => ({
        ...old,
        javascriptError: event.message || 'Unknown JavaScript error',
      }));
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      setInfo((old) => ({
        ...old,
        promiseError: String(event.reason),
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleRejection
      );
    };
  }, []);

  return (
    <main
      style={{
        padding: 20,
        fontFamily: 'Arial, sans-serif',
        background: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      <h1>IMARA PWA Diagnostic</h1>

      <p>
        This page checks the installed PWA environment.
      </p>

      <pre
        style={{
          background: '#111',
          color: '#00ff88',
          padding: 20,
          borderRadius: 10,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {Object.entries(info)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n\n')}
      </pre>
    </main>
  );
}
