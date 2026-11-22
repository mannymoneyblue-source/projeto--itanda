import { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { fetchAllProfiles, fetchAllOrders } from '@/services/api';
import { formatDateShort, formatKz } from '@/utils/format';
import type { Profile, Order } from '@/types';

export function AdminCustomersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([fetchAllProfiles(), fetchAllOrders()])
      .then(([p, o]) => { setProfiles(p); setOrders(o); })
      .finally(() => setLoading(false));
  }, []);

  const customers = profiles.filter((p) => p.role === 'customer');
  const filtered = customers.filter((c) =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerOrders = (customerId: string) => orders.filter((o) => o.customer_id === customerId);
  const getCustomerSpent = (customerId: string) =>
    getCustomerOrders(customerId)
      .filter((o) => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0);

  return (
    <AdminLayout activePath="/admin/clientes">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold mb-1">Clientes</h1>
        <p className="text-sm text-text-secondary">{customers.length} cliente(s)</p>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input className="input pl-10" placeholder="Pesquisar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((customer) => {
            const custOrders = getCustomerOrders(customer.id);
            const spent = getCustomerSpent(customer.id);
            return (
              <div key={customer.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                    <Users size={20} className="text-accent-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{customer.full_name || 'Sem nome'}</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-text-secondary flex items-center gap-2">
                        <Mail size={14} className="text-text-muted" /> {customer.email}
                      </p>
                      {customer.phone && (
                        <p className="text-sm text-text-secondary flex items-center gap-2">
                          <Phone size={14} className="text-text-muted" /> {customer.phone}
                        </p>
                      )}
                      <p className="text-sm text-text-muted flex items-center gap-2">
                        <Calendar size={14} /> Desde {formatDateShort(customer.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-muted">Encomendas</p>
                    <p className="text-lg font-display font-bold flex items-center gap-1.5">
                      <ShoppingBag size={14} className="text-accent-400" /> {custOrders.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Total gasto</p>
                    <p className="text-lg font-display font-bold">{formatKz(spent)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Users size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">Sem clientes registados.</p>
        </div>
      )}
    </AdminLayout>
  );
}
