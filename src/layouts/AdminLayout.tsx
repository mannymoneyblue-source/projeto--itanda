import type { ReactNode } from 'react';
import { useState } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Users, FolderTree, LogOut, Menu, X, Store, Star } from 'lucide-react';
import { Link, useRouter } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/produtos', label: 'Produtos', icon: Package },
  { path: '/admin/categorias', label: 'Categorias', icon: FolderTree },
  { path: '/admin/encomendas', label: 'Encomendas', icon: ShoppingCart },
  { path: '/admin/avaliacoes', label: 'Avaliações', icon: Star },
  { path: '/admin/clientes', label: 'Clientes', icon: Users },
];

export function AdminLayout({ children, activePath }: { children: ReactNode; activePath: string }) {
  const { signOut } = useAuth();
  const { navigate } = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-base-900">
      {/* Sidebar (desktop) */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-60 flex-shrink-0 bg-base-800 border-r border-border z-50 flex flex-col transition-transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <Logo size="sm" />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-surface-hover">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Painel</p>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activePath === item.path
                  ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
              }`}
            >
              <item.icon size={18} /> {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
            <Store size={18} /> Ver loja
          </Link>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-error-500 hover:bg-surface-hover transition-colors">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 h-14 border-b border-border bg-base-800/80 backdrop-blur-lg flex items-center justify-between px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-surface-hover">
            <Menu size={20} />
          </button>
          <span className="font-display font-semibold">Admin</span>
          <Link to="/" className="p-2 rounded-lg hover:bg-surface-hover">
            <Store size={20} />
          </Link>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
