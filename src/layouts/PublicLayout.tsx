import type { ReactNode } from 'react';
import { PublicHeader } from '@/layouts/PublicHeader';
import { PublicFooter } from '@/layouts/PublicFooter';
import { CartDrawer } from '@/components/CartDrawer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { CitandaAssistant } from '@/components/CitandaAssistant';
import { useAuth } from '@/contexts/AuthContext';

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-base-900">
      <PublicHeader />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <PublicFooter />
      <CartDrawer />
      <WhatsAppButton />
      {user?.role === 'customer' && <CitandaAssistant />}
    </div>
  );
}
