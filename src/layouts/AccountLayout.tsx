import type { ReactNode } from 'react';
import { LayoutDashboard, ShoppingBag, Download, User, LogOut, Store } from 'lucide-react';
import { Link, useRouter } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

const navItems = [
  { path: '/conta', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/conta/encomendas', label: 'Encomendas', icon: ShoppingBag },
  { path: '/conta/downloads', label: 'Downloads', icon: Download },
  { path: '/conta/perfil', label: 'Perfil', icon: User },
];

export function AccountLayout({ children, activePath }: { children: ReactNode; activePath: string }) {
  const { signOut, user } = useAuth();
  const { navigate } = useRouter();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-900">
      {/* Top bar */}
      <header className="border-b border-border bg-base-800/80 backdrop-blur-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <span className="text-text-muted">/</span>
            <span className="text-sm font-medium text-text-secondary">Minha conta</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-400 transition-colors">
              <Store size={16} /> Loja
            </Link>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-error-500 transition-colors">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="card p-4 mb-4">
              <p className="text-sm font-medium text-text-primary truncate">{user?.fullName || 'Utilizador'}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activePath === item.path
                      ? 'bg-accent-500/10 text-accent-400'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <item.icon size={18} /> {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
