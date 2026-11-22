import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Check, X, FileText, ChevronRight, ExternalLink, Ban } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { fetchAllOrders, confirmPayment, updateOrderStatus, rejectPayment, getPaymentProofUrl } from '@/services/api';
import { formatKz, formatDate, orderStatusLabel, paymentStatusLabel, paymentMethodLabel } from '@/utils/format';
import type { Order } from '@/types';

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const load = () => {
    setLoading(true);
    fetchAllOrders().then(setOrders).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout activePath="/admin/encomendas">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold mb-1">Encomendas</h1>
        <p className="text-sm text-text-secondary">{orders.length} encomenda(s) no total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input className="input pl-10" placeholder="Pesquisar por ID, cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-44 cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os estados</option>
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmada</option>
          <option value="paid">Paga</option>
          <option value="completed">Concluída</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={18} className="text-accent-400" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-text-muted">{order.customer_name} · {formatDate(order.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    order.status === 'paid' || order.status === 'completed' ? 'bg-success-500/10 text-success-500' :
                    order.status === 'cancelled' ? 'bg-error-500/10 text-error-500' :
                    'bg-warning-500/10 text-warning-500'
                  }`}>
                    {orderStatusLabel[order.status]}
                  </span>
                  <span className="font-display font-bold">{formatKz(order.total)}</span>
                  <button onClick={() => setSelectedOrder(order)} className="p-2 rounded-lg hover:bg-surface-hover">
                    <ChevronRight size={18} className="text-text-muted" />
                  </button>
                </div>
              </div>

              {order.payments && order.payments.length > 0 && order.payments[0].status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Pagamento: {paymentMethodLabel[order.payments[0].method]} · {paymentStatusLabel[order.payments[0].status]}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try { await confirmPayment(order.payments![0].id); load(); } catch (e) { alert(e instanceof Error ? e.message : ''); }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-500/10 text-success-500 text-sm font-medium hover:bg-success-500/20 transition-colors"
                    >
                      <Check size={14} /> Confirmar pagamento
                    </button>
                    <button
                      onClick={async () => {
                        const reason = prompt('Motivo da rejeição (opcional):');
                        if (reason === null) return;
                        try { await rejectPayment(order.payments![0].id, reason); load(); } catch (e) { alert(e instanceof Error ? e.message : ''); }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-500/10 text-error-500 text-sm font-medium hover:bg-error-500/20 transition-colors"
                    >
                      <Ban size={14} /> Rejeitar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <ShoppingCart size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">Sem encomendas.</p>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onChanged={load} />
      )}
    </AdminLayout>
  );
}

function OrderDetailModal({ order, onClose, onChanged }: { order: Order; onClose: () => void; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      onChanged();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order.payments || order.payments.length === 0) return;
    setLoading(true);
    try {
      await confirmPayment(order.payments[0].id);
      onChanged();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display text-xl font-bold">Encomenda #{order.id.slice(0, 8)}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Customer */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Cliente</h3>
            <div className="card-raised p-4 space-y-1">
              <p className="text-sm"><span className="text-text-muted">Nome:</span> {order.customer_name || '—'}</p>
              <p className="text-sm"><span className="text-text-muted">Email:</span> {order.customer_email}</p>
              <p className="text-sm"><span className="text-text-muted">Telefone:</span> {order.customer_phone || '—'}</p>
              <p className="text-sm"><span className="text-text-muted">Tipo:</span> {order.is_guest ? 'Convidado' : 'Conta'}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Itens</h3>
            <div className="card-raised p-4 space-y-2">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.product_name} ({item.quantity}x)</span>
                  <span className="font-medium">{formatKz(item.subtotal)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border-subtle flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-display">{formatKz(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          {order.payments && order.payments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Pagamento</h3>
              <div className="card-raised p-4 space-y-2">
                <p className="text-sm"><span className="text-text-muted">Método:</span> {paymentMethodLabel[order.payments[0].method]}</p>
                <p className="text-sm"><span className="text-text-muted">Estado:</span> {paymentStatusLabel[order.payments[0].status]}</p>
                {order.payments[0].reference && <p className="text-sm"><span className="text-text-muted">Referência:</span> {order.payments[0].reference}</p>}
                {order.payments[0].proof_path && <ProofLink proofPath={order.payments[0].proof_path} />}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {order.payments && order.payments.length > 0 && order.payments[0].status === 'pending' && (
              <>
                <button onClick={handleConfirmPayment} disabled={loading} className="btn-primary w-full">
                  <Check size={16} /> Confirmar pagamento
                </button>
                <button
                  onClick={async () => {
                    const reason = prompt('Motivo da rejeição (opcional):');
                    if (reason === null) return;
                    setLoading(true);
                    try {
                      await rejectPayment(order.payments![0].id, reason);
                      onChanged();
                      onClose();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : '');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-error-500/10 text-error-500 text-sm font-medium hover:bg-error-500/20 transition-colors"
                >
                  <Ban size={16} /> Rejeitar pagamento
                </button>
              </>
            )}

            <div>
              <label className="label">Alterar estado da encomenda</label>
              <div className="flex gap-2 flex-wrap">
                {['pending', 'confirmed', 'paid', 'completed', 'cancelled'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={loading || order.status === s}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      order.status === s ? 'bg-accent-500 text-base-900' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {orderStatusLabel[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProofLink({ proofPath }: { proofPath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPaymentProofUrl(proofPath)
      .then(setUrl)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [proofPath]);

  if (loading) return <p className="text-sm text-text-muted">A carregar comprovativo...</p>;
  if (error || !url) return <p className="text-sm text-error-500">Comprovativo indisponível</p>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-accent-400 hover:underline"
    >
      <ExternalLink size={14} /> Ver comprovativo
    </a>
  );
}
