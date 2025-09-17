'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tv, Film, Clapperboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'TV', href: '/tv', icon: Tv },
  { name: 'Movies', href: '/movies', icon: Film },
  { name: 'Series', href: '/series', icon: Clapperboard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
                <Clapperboard className="h-6 w-6" />
                <span className="font-bold">NovaStream</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                {navigation.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                    'transition-colors hover:text-foreground/80',
                    pathname.startsWith(item.href) ? 'text-foreground' : 'text-foreground/60'
                    )}
                >
                    {item.name}
                </Link>
                ))}
            </nav>
        </div>
        <div>
            {/* User profile / etc can go here */}
        </div>
    </div>
  );
}
