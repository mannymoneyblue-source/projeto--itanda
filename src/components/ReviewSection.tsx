import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Trash2, Edit2, AlertCircle, Check, BadgeCheck, Send, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from '@/contexts/RouterContext';
import {
  fetchProductReviews,
  fetchMyReview,
  createReview,
  updateReview,
  deleteReview,
  reportReview,
} from '@/services/api';
import type { ProductReview } from '@/types';

interface ReviewSectionProps {
  productId: string;
}

function StarRating({ rating, size = 16, interactive = false, onChange }: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
        >
          <Star
            size={size}
            className={
              star <= rating
                ? 'text-accent-400 fill-accent-400'
                : 'text-text-muted'
            }
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ReviewSection({ productId }: ReviewSectionProps) {
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [myReview, setMyReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reporting, setReporting] = useState<ProductReview | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDone, setReportDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [revs, mine] = await Promise.all([
        fetchProductReviews(productId),
        user ? fetchMyReview(productId) : Promise.resolve(null),
      ]);
      setReviews(revs);
      setMyReview(mine);
      if (mine) {
        setRating(mine.rating);
        setComment(mine.comment);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [productId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!user) {
      setError('Precisas de iniciar sessão para avaliar.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('Seleciona uma classificação de 1 a 5 estrelas.');
      return;
    }
    if (!comment.trim()) {
      setError('Escreve um comentário.');
      return;
    }

    setSubmitting(true);
    try {
      if (myReview && editing) {
        await updateReview(myReview.id, rating, comment.trim());
        setEditing(false);
      } else if (myReview) {
        await updateReview(myReview.id, rating, comment.trim());
      } else {
        await createReview(productId, rating, comment.trim());
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar avaliação.';
      setError(msg.includes('duplicate') || msg.includes('unique') ? 'Já avaliaste este produto.' : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    if (!confirm('Tens a certeza que queres eliminar a tua avaliação?')) return;
    try {
      await deleteReview(myReview.id);
      setMyReview(null);
      setComment('');
      setRating(5);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar.');
    }
  };

  const handleEdit = () => {
    setEditing(true);
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment);
    }
  };

  const handleReport = async () => {
    if (!reporting) return;
    try {
      await reportReview(reporting.id, reportReason.trim());
      setReportDone(reporting.id);
      setReporting(null);
      setReportReason('');
      setTimeout(() => setReportDone(null), 4000);
    } catch {
      setReporting(null);
      setReportReason('');
    }
  };

  return (
    <section className="mt-16">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare size={22} className="text-accent-400" />
        <h2 className="font-display text-2xl font-bold">Avaliações</h2>
        {reviews.length > 0 && (
          <span className="badge bg-accent-500/10 text-accent-400">{reviews.length}</span>
        )}
      </div>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 text-center">
            <p className="font-display text-4xl font-bold text-accent-400">{avg.toFixed(1)}</p>
            <StarRating rating={Math.round(avg)} size={18} />
            <p className="text-sm text-text-muted mt-2">{reviews.length} avaliação(ões)</p>
          </div>
          <div className="card p-6 sm:col-span-2">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Distribuição</h3>
            <div className="space-y-2">
              {distribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary w-8 flex items-center gap-1">
                    {star} <Star size={12} className="text-accent-400 fill-accent-400" />
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-hover overflow-hidden">
                    <div
                      className="h-full bg-accent-400 rounded-full transition-all"
                      style={{ width: `${reviews.length > 0 ? (count / reviews.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-text-muted w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review form */}
      {user ? (
        <div className="card p-6 mb-8">
          <h3 className="font-semibold text-text-primary mb-4">
            {myReview && !editing ? 'A tua avaliação' : editing ? 'Editar avaliação' : 'Avaliar este produto'}
          </h3>

          {myReview && !editing ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <StarRating rating={myReview.rating} size={18} />
                {myReview.is_verified_purchase && (
                  <span className="badge bg-success-500/10 text-success-500">
                    <BadgeCheck size={12} /> Compra verificada
                  </span>
                )}
              </div>
              <p className="text-text-secondary leading-relaxed mb-4">{myReview.comment}</p>
              <div className="flex gap-3">
                <button onClick={handleEdit} className="btn-secondary !py-2 !px-4 text-sm">
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={handleDelete} className="btn-ghost !py-2 !px-4 text-sm text-error-500 hover:bg-error-500/10">
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Classificação</label>
                <StarRating rating={rating} size={28} interactive onChange={setRating} />
              </div>
              <div>
                <label className="label">Comentário</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partilha a tua opinião sobre este produto..."
                  maxLength={500}
                />
                <p className="text-xs text-text-muted mt-1">{comment.length}/500</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-error-500/10 border border-error-500/20 text-sm text-error-500">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success-500/10 border border-success-500/20 text-sm text-success-500">
                  <Check size={16} /> Avaliação enviada com sucesso!
                </div>
              )}

              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary">
                  <Send size={16} /> {submitting ? 'A enviar...' : 'Publicar avaliação'}
                </button>
                {editing && (
                  <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="card p-6 mb-8 text-center">
          <p className="text-text-secondary mb-3">Inicia sessão para avaliar este produto.</p>
          <Link to="/login" className="btn-primary inline-flex">Entrar</Link>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card p-6 h-32 skeleton" />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="card p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary">{review.reviewer_name || 'Anónimo'}</span>
                    {review.is_verified_purchase && (
                      <span className="badge bg-success-500/10 text-success-500">
                        <BadgeCheck size={12} /> Compra verificada
                      </span>
                    )}
                  </div>
                  <StarRating rating={review.rating} size={14} />
                </div>
                <span className="text-xs text-text-muted">{formatDate(review.created_at)}</span>
              </div>
              <p className="text-text-secondary leading-relaxed">{review.comment}</p>
              {reportDone === review.id ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-success-500">
                  <Check size={12} /> Denúncia enviada. Obrigado por ajudar a manter a comunidade segura.
                </p>
              ) : (
                <div className="mt-3">
                  {reporting?.id === review.id ? (
                    <div className="p-3 rounded-lg bg-surface-hover border border-border-subtle space-y-2">
                      <textarea
                        className="input min-h-[60px] resize-none text-sm"
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Motivo da denúncia (opcional): spam, linguagem ofensiva, conteúdo enganoso..."
                        maxLength={300}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setReporting(null)} className="btn-ghost !py-1.5 !px-3 text-xs">
                          Cancelar
                        </button>
                        <button onClick={handleReport} className="btn-secondary !py-1.5 !px-3 text-xs text-error-500">
                          <Flag size={12} /> Enviar denúncia
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReporting(review)}
                      className="text-xs text-text-muted hover:text-error-500 transition-colors flex items-center gap-1"
                    >
                      <Flag size={12} /> Denunciar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <MessageSquare size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">Ainda não há avaliações para este produto.</p>
          {user && (
            <p className="text-sm text-text-muted mt-2">Sê o primeiro a avaliar!</p>
          )}
        </div>
      )}

      {isAdmin && reviews.length > 0 && (
        <div className="mt-4 text-center">
          <Link to="/admin/avaliacoes" className="text-sm text-accent-400 hover:underline">
            Gerir avaliações no painel admin
          </Link>
        </div>
      )}
    </section>
  );
}
