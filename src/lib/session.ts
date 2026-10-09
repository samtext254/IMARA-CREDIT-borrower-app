// imara-onlineservice/src/lib/session.ts
//
// ─── SESSION STATE BRIDGE ───────────────────────────────────────
// Registers the API client's session-ended callback once, and lets
// React components subscribe to it.
// ────────────────────────────────────────────────────────────────

'use client';

import {
  setSessionEndedHandler,
  type SessionEndedReason,
} from './api';

type Listener = (reason: SessionEndedReason) => void;

const listeners = new Set<Listener>();

// Wire the API client's session-ended hook into this module once,
// at import time. The API client calls this when the session is
// definitively dead.
setSessionEndedHandler((reason) => {
  listeners.forEach((fn) => {
    try {
      fn(reason);
    } catch (err) {
      console.error('Session listener threw:', err);
    }
  });
});

export function subscribeToSessionEnd(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type { SessionEndedReason };