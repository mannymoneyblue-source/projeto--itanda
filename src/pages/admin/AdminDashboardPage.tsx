import { useState, useEffect } from 'react';
import { ShoppingCart, Users, Package, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { fetchDashboardStats, fetchAllOrders } from '@/services/api';
import { formatKz, formatDate, orderStatusLabel } from '@/utils/format';
import { Link } from '@/contexts/RouterContext';
import type { Order } from '@/types';

export function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, pendingOrders: 0, totalCustomers: 0, activeProducts: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchAllOrders()])
      .then(([s, o]) => { setStats(s); setRecentOrders(o.slice(0, 5)); })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Vendas confirmadas', value: formatKz(stats.totalSales), icon: DollarSign, color: 'text-success-500 bg-success-500/10' },
    { label: 'Encomendas', value: stats.totalOrders, icon: ShoppingCart, color: 'text-accent-400 bg-accent-500/10' },
    { label: 'Pendentes', value: stats.pendingOrders, icon: Clock, color: 'text-warning-500 bg-warning-500/10' },
    { label: 'Clientes', value: stats.totalCustomers, icon: Users, color: 'text-accent-400 bg-accent-500/10' },
    { label: 'Produtos ativos', value: stats.activeProducts, icon: Package, color: 'text-accent-400 bg-accent-500/10' },
  ];

  return (
    <AdminLayout activePath="/admin">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-sm text-text-secondary">Visão geral da loja</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card, i) => (
          <div key={i} className="card p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <p className="text-xl font-display font-bold">{loading ? '—' : card.value}</p>
            <p className="text-xs text-text-muted mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp size={18} className="text-accent-400" /> Encomendas recentes
          </h2>
          <Link to="/admin/encomendas" className="text-sm text-accent-400 hover:text-accent-300">Ver tudo</Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton" />)}
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 font-medium">Encomenda</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border-subtle last:border-0">
                    <td className="py-3 font-mono">#{order.id.slice(0, 8)}</td>
                    <td className="py-3 text-text-secondary">{order.customer_name || order.customer_email}</td>
                    <td className="py-3 text-text-muted">{formatDate(order.created_at)}</td>
                    <td className="py-3">
                      <span className={`badge ${
                        order.status === 'paid' || order.status === 'completed' ? 'bg-success-500/10 text-success-500' :
                        order.status === 'cancelled' ? 'bg-error-500/10 text-error-500' :
                        'bg-warning-500/10 text-warning-500'
                      }`}>
                        {orderStatusLabel[order.status]}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium">{formatKz(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-8 text-text-muted">Sem encomendas registadas.</p>
        )}
      </div>
    </AdminLayout>
  );
}
