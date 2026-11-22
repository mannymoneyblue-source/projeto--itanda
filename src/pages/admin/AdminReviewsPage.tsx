import { useState, useEffect } from 'react';
import { Star, EyeOff, Eye, Trash2, Flag, MessageSquare, BadgeCheck, Search } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { fetchAllReviews, moderateReview, deleteReview } from '@/services/api';
import type { ProductReview } from '@/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'reported' | 'hidden'>('all');

  const load = () => {
    setLoading(true);
    fetchAllReviews()
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleHide = async (id: string) => {
    try {
      await moderateReview(id, 'hide');
      load();
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleShow = async (id: string) => {
    try {
      await moderateReview(id, 'show');
      load();
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminar a avaliação de "${name}"?`)) return;
    try {
      await deleteReview(id);
      load();
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const filtered = reviews.filter((r) => {
    if (filter === 'reported' && !r.is_reported) return false;
    if (filter === 'hidden' && !r.is_hidden) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.comment || '').toLowerCase().includes(q) || (r.reviewer_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AdminLayout activePath="/admin/avaliacoes">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold mb-1">Avaliações</h1>
        <p className="text-sm text-text-secondary">Modera avaliações de produtos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input className="input pl-10" placeholder="Pesquisar por comentário ou autor..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48 cursor-pointer" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">Todas</option>
          <option value="reported">Denunciadas</option>
          <option value="hidden">Ocultas</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-medium text-text-primary">{review.reviewer_name || 'Anónimo'}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          className={s <= review.rating ? 'text-accent-400 fill-accent-400' : 'text-text-muted'}
                        />
                      ))}
                    </div>
                    {review.is_verified_purchase && (
                      <span className="badge bg-success-500/10 text-success-500">
                        <BadgeCheck size={10} /> Compra verificada
                      </span>
                    )}
                    {review.is_hidden && (
                      <span className="badge bg-warning-500/10 text-warning-500">
                        <EyeOff size={10} /> Oculta
                      </span>
                    )}
                    {review.is_reported && (
                      <span className="badge bg-error-500/10 text-error-500">
                        <Flag size={10} /> Denunciada
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed mb-2">{review.comment}</p>
                  <p className="text-xs text-text-muted">{formatDate(review.created_at)}</p>
                  {review.report_reason && (
                    <p className="text-xs text-error-500 mt-1">Motivo: {review.report_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {review.is_hidden ? (
                    <button onClick={() => handleShow(review.id)} className="p-2 rounded-lg hover:bg-surface-hover transition-colors" title="Mostrar">
                      <Eye size={16} className="text-text-secondary" />
                    </button>
                  ) : (
                    <button onClick={() => handleHide(review.id)} className="p-2 rounded-lg hover:bg-surface-hover transition-colors" title="Ocultar">
                      <EyeOff size={16} className="text-text-secondary" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(review.id, review.reviewer_name || 'Anónimo')} className="p-2 rounded-lg hover:bg-error-500/10 transition-colors" title="Eliminar">
                    <Trash2 size={16} className="text-text-secondary hover:text-error-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <MessageSquare size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">Sem avaliações para mostrar.</p>
        </div>
      )}
    </AdminLayout>
  );
}
