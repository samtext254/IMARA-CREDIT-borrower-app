'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/home',       label: 'Home',    icon: Home },
  { href: '/apply/loan', label: 'Apply',   icon: PlusCircle },
  { href: '/loans',      label: 'Loans',   icon: FileText },
  { href: '/profile',    label: 'Profile', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-plum-900 bg-plum-800 no-scrollbar">
      {/* subtle yellow accent line at the top edge */}
      <div className="h-0.5 w-full bg-brand-500" />

      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active =
            tab.href === '/home'
              ? pathname === '/home'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors',
                  active
                    ? 'text-brand-500'
                    : 'text-white/50 hover:text-white/80'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5',
                    active ? 'text-brand-500' : 'text-current'
                  )}
                  strokeWidth={active ? 2.6 : 2}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}