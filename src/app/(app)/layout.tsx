// src/app/(app)/layout.tsx
//
// ─── APP LAYOUT (PROTECTED) ─────────────────────────────────────
// Wraps every authenticated page with:
//   1. A session check (calls /v1/imara/auth/me on mount)
//   2. A loading skeleton until the check resolves
//   3. The bottom nav shell
//
// If the session is dead, the shared SessionWatcher fires and
// routes to /session-expired. This component does not handle that
// redirect itself — it just stops rendering children and shows a
// skeleton.
// ────────────────────────────────────────────────────────────────

import { AppLayoutShell } from './_shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutShell>{children}</AppLayoutShell>;
}