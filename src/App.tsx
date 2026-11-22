import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { RouterProvider, useRouter } from '@/contexts/RouterContext';
import { PublicLayout } from '@/layouts/PublicLayout';

// Public pages
import { HomePage } from '@/pages/public/HomePage';
import { CatalogPage } from '@/pages/public/CatalogPage';
import { ProductDetailPage } from '@/pages/public/ProductDetailPage';
import { CheckoutPage } from '@/pages/public/CheckoutPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { ContactPage } from '@/pages/public/ContactPage';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// Account pages
import { AccountDashboardPage } from '@/pages/account/AccountDashboardPage';
import { AccountOrdersPage, AccountOrderDetailPage } from '@/pages/account/AccountOrdersPage';
import { AccountDownloadsPage } from '@/pages/account/AccountDownloadsPage';
import { AccountProfilePage } from '@/pages/account/AccountProfilePage';

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import { AdminCustomersPage } from '@/pages/admin/AdminCustomersPage';
import { AdminReviewsPage } from '@/pages/admin/AdminReviewsPage';

function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-4xl font-bold mb-4">404</h1>
      <p className="text-text-secondary mb-6">A página que procuras não existe.</p>
      <a href="/" data-link className="btn-primary">Voltar ao início</a>
    </div>
  );
}

function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, isAdmin, loading } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (requireAdmin && !isAdmin) {
        navigate('/');
      }
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-900">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (requireAdmin && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { path } = useRouter();
  const cleanPath = path.split('?')[0];

  // Auth pages (no layout)
  if (cleanPath === '/login') return <LoginPage />;
  if (cleanPath === '/registo') return <RegisterPage />;

  // Admin routes
  if (cleanPath === '/admin') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminDashboardPage />
      </ProtectedRoute>
    );
  }
  if (cleanPath === '/admin/produtos') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminProductsPage />
      </ProtectedRoute>
    );
  }
  if (cleanPath === '/admin/categorias') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminCategoriesPage />
      </ProtectedRoute>
    );
  }
  if (cleanPath === '/admin/encomendas') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminOrdersPage />
      </ProtectedRoute>
    );
  }
  if (cleanPath === '/admin/clientes') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminCustomersPage />
      </ProtectedRoute>
    );
  }
  if (cleanPath === '/admin/avaliacoes') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminReviewsPage />
      </ProtectedRoute>
    );
  }

  // Account routes (protected, customer)
  if (cleanPath === '/conta') {
    return (
      <ProtectedRoute>
        <AccountDashboardPage />
      </ProtectedRoute>
    );
  }
  if (cleanPath === '/conta/encomendas') {
    return (
      <ProtectedRoute>
        <AccountOrdersPage />
      </ProtectedRoute>
    );
  }
  if (cleanPath.startsWith('/conta/encomendas/')) {
    const orderId = cleanPath.replace('/conta/encomendas/', '');
    return (
      <ProtectedRoute>
        <AccountOrderDetailPage orderId={orderId} />
      </ProtectedRoute>
    );
  }
  if (cleanPath === '/conta/downloads') {
    return (
      <ProtectedRoute>
        <AccountDownloadsPage />
      </ProtectedRoute>
    );
  }
  if (cleanPath === '/conta/perfil') {
    return (
      <ProtectedRoute>
        <AccountProfilePage />
      </ProtectedRoute>
    );
  }

  // Public routes (with layout)
  if (cleanPath === '/') {
    return <PublicLayout><HomePage /></PublicLayout>;
  }
  if (cleanPath === '/catalogo') {
    return <PublicLayout><CatalogPage /></PublicLayout>;
  }
  if (cleanPath.startsWith('/produto/')) {
    const slug = cleanPath.replace('/produto/', '');
    return <PublicLayout><ProductDetailPage slug={slug} /></PublicLayout>;
  }
  if (cleanPath === '/checkout') {
    return <PublicLayout><CheckoutPage /></PublicLayout>;
  }
  if (cleanPath === '/sobre') {
    return <PublicLayout><AboutPage /></PublicLayout>;
  }
  if (cleanPath === '/contacto') {
    return <PublicLayout><ContactPage /></PublicLayout>;
  }

  return <PublicLayout><NotFoundPage /></PublicLayout>;
}

function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
