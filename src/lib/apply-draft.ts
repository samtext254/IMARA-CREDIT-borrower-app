/* ------------------------------------------------------------------ */
/*  Apply-flow draft persistence (sessionStorage)                      */
/*  Survives refresh within a tab. Cleared on successful submission.  */
/* ------------------------------------------------------------------ */

import type { LoanApplicationDraft } from './lending-types';

const KEY = 'imara.apply.draft.v1';

export type DraftPartial = Partial<LoanApplicationDraft>;

export function readDraft(): DraftPartial {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DraftPartial;
  } catch {
    return {};
  }
}

export function writeDraft(patch: DraftPartial): DraftPartial {
  const next = { ...readDraft(), ...patch };
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }
  return next;
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}