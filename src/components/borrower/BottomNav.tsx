'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, WalletCards, Receipt, PiggyBank, MoreHorizontal } from 'lucide-react';

const TABS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/loans', label: 'Loans', icon: WalletCards },
  { href: '/payments', label: 'Payments', icon: Receipt },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
] as const;

interface BottomNavProps {
  onMoreClick?: () => void;
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const pathname = usePathname() || '/dashboard';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? 'text-[#0a5cbe]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon
                size={21}
                fill={active ? 'currentColor' : 'none'}
                fillOpacity={active ? 0.15 : 0}
              />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMoreClick}
          className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          <MoreHorizontal size={21} />
          More
        </button>
      </div>
    </nav>
  );
}