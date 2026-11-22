import { useState, useEffect } from 'react';
import { ShoppingBag, FileText } from 'lucide-react';
import { AccountLayout } from '@/layouts/AccountLayout';
import { fetchMyOrders, fetchOrderById } from '@/services/api';
import { formatKz, formatDate, orderStatusLabel, paymentStatusLabel } from '@/utils/format';
import { Link } from '@/contexts/RouterContext';
import type { Order } from '@/types';

export function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  return (
    <AccountLayout activePath="/conta/encomendas">
      <h1 className="font-display text-2xl font-bold mb-6">Minhas encomendas</h1>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} to={`/conta/encomendas/${order.id}`} className="card p-5 hover:border-border-strong transition-colors block">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-mono text-sm font-medium">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-text-muted mt-0.5">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    order.status === 'paid' || order.status === 'completed' ? 'bg-success-500/10 text-success-500' :
                    order.status === 'cancelled' ? 'bg-error-500/10 text-error-500' :
                    'bg-warning-500/10 text-warning-500'
                  }`}>
                    {orderStatusLabel[order.status]}
                  </span>
                  <span className="font-display font-bold text-lg">{formatKz(order.total)}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border-subtle">
                <p className="text-sm text-text-secondary">
                  {order.order_items?.length || 0} item(s)
                  {order.payments && order.payments.length > 0 && (
                    <> · Pagamento: <span className="text-text-muted">{paymentStatusLabel[order.payments[0].status]}</span></>
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <ShoppingBag size={40} className="text-text-muted mx-auto mb-4" />
          <h3 className="font-medium text-text-primary mb-2">Sem encomendas</h3>
          <p className="text-text-secondary text-sm mb-6">Ainda não fizeste nenhuma compra.</p>
          <Link to="/catalogo" className="btn-primary">Explorar catálogo</Link>
        </div>
      )}
    </AccountLayout>
  );
}

export function AccountOrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderById(orderId).then(setOrder).finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <AccountLayout activePath="/conta/encomendas">
        <div className="h-64 skeleton" />
      </AccountLayout>
    );
  }

  if (!order) {
    return (
      <AccountLayout activePath="/conta/encomendas">
        <div className="card p-12 text-center">
          <FileText size={40} className="text-text-muted mx-auto mb-4" />
          <h3 className="font-medium mb-2">Encomenda não encontrada</h3>
          <Link to="/conta/encomendas" className="btn-secondary mt-4">Voltar</Link>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout activePath="/conta/encomendas">
      <Link to="/conta/encomendas" className="text-sm text-text-secondary hover:text-accent-400 mb-4 inline-block">
        ← Voltar às encomendas
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Encomenda #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-text-muted">{formatDate(order.created_at)}</p>
        </div>
        <span className={`badge ${
          order.status === 'paid' || order.status === 'completed' ? 'bg-success-500/10 text-success-500' :
          order.status === 'cancelled' ? 'bg-error-500/10 text-error-500' :
          'bg-warning-500/10 text-warning-500'
        }`}>
          {orderStatusLabel[order.status]}
        </span>
      </div>

      {/* Items */}
      <div className="card p-5 mb-4">
        <h3 className="font-semibold mb-4">Itens</h3>
        <div className="space-y-3">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 pb-3 border-b border-border-subtle last:border-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-text-muted">{item.quantity}x {formatKz(item.price)}</p>
              </div>
              <span className="text-sm font-medium">{formatKz(item.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-display font-bold text-xl">{formatKz(order.total)}</span>
        </div>
      </div>

      {/* Payment info */}
      {order.payments && order.payments.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Pagamento</h3>
          {order.payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">{paymentStatusLabel[payment.status]}</p>
                {payment.reference && <p className="text-xs text-text-muted mt-0.5">Ref: {payment.reference}</p>}
              </div>
              <span className={`badge ${
                payment.status === 'confirmed' ? 'bg-success-500/10 text-success-500' :
                payment.status === 'rejected' ? 'bg-error-500/10 text-error-500' :
                'bg-warning-500/10 text-warning-500'
              }`}>
                {paymentStatusLabel[payment.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  );
}


