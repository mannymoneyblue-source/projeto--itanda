import { useState, useEffect } from 'react';
import { ShoppingBag, Download, Clock, TrendingUp } from 'lucide-react';
import { AccountLayout } from '@/layouts/AccountLayout';
import { fetchMyOrders, fetchMyDeliveries } from '@/services/api';
import { formatKz, formatDate, orderStatusLabel } from '@/utils/format';
import { Link } from '@/contexts/RouterContext';
import type { Order, DigitalDelivery } from '@/types';

export function AccountDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<DigitalDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMyOrders(), fetchMyDeliveries()])
      .then(([o, d]) => { setOrders(o); setDeliveries(d); })
      .finally(() => setLoading(false));
  }, []);

  const recentOrders = orders.slice(0, 5);
  const totalSpent = orders.filter((o) => o.status === 'paid' || o.status === 'completed').reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: 'Encomendas', value: orders.length, icon: ShoppingBag },
    { label: 'Downloads', value: deliveries.length, icon: Download },
    { label: 'Pendentes', value: orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length, icon: Clock },
    { label: 'Total gasto', value: formatKz(totalSpent), icon: TrendingUp },
  ];

  return (
    <AccountLayout activePath="/conta">
      <h1 className="font-display text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="card p-5">
            <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center mb-3">
              <stat.icon size={18} className="text-accent-400" />
            </div>
            <p className="text-2xl font-display font-bold">{loading ? '—' : stat.value}</p>
            <p className="text-xs text-text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Encomendas recentes</h2>
          <Link to="/conta/encomendas" className="text-sm text-accent-400 hover:text-accent-300">Ver tudo</Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton" />)}
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link key={order.id} to={`/conta/encomendas/${order.id}`} className="flex items-center justify-between p-3 rounded-lg bg-surface-hover hover:bg-surface-raised transition-colors">
                <div>
                  <p className="text-sm font-medium font-mono">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-text-muted">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    order.status === 'paid' || order.status === 'completed' ? 'bg-success-500/10 text-success-500' :
                    order.status === 'cancelled' ? 'bg-error-500/10 text-error-500' :
                    'bg-warning-500/10 text-warning-500'
                  }`}>
                    {orderStatusLabel[order.status]}
                  </span>
                  <span className="text-sm font-medium">{formatKz(order.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingBag size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary text-sm">Ainda não tens encomendas.</p>
            <Link to="/catalogo" className="btn-primary mt-4">Ver catálogo</Link>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
