'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Jovens', href: '/fichas' },
  { label: 'Casais', href: '/fichas/casais' },
];

export function FichasTabsNav() {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-muted p-1">
      {tabs.map((tab) => {
        const isActive = tab.href === '/fichas' ? pathname === '/fichas' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
              isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
