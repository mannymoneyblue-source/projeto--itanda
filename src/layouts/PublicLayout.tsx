import type { ReactNode } from 'react';
import { PublicHeader } from '@/layouts/PublicHeader';
import { PublicFooter } from '@/layouts/PublicFooter';
import { CartDrawer } from '@/components/CartDrawer';
import { WhatsAppButton } from '@/components/WhatsAppButton';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-base-900">
      <PublicHeader />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <PublicFooter />
      <CartDrawer />
      <WhatsAppButton />
    </div>
  );
}
