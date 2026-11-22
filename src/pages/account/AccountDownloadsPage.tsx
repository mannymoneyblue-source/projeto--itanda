import { useState, useEffect } from 'react';
import { Download, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AccountLayout } from '@/layouts/AccountLayout';
import { fetchMyDeliveries } from '@/services/api';
import { formatKz, formatDate } from '@/utils/format';
import type { DigitalDelivery } from '@/types';

export function AccountDownloadsPage() {
  const [deliveries, setDeliveries] = useState<DigitalDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyDeliveries().then(setDeliveries).finally(() => setLoading(false));
  }, []);

  return (
    <AccountLayout activePath="/conta/downloads">
      <h1 className="font-display text-2xl font-bold mb-6">Os meus downloads</h1>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton" />)}
        </div>
      ) : deliveries.length > 0 ? (
        <div className="space-y-4">
          {deliveries.map((delivery) => {
            const expired = new Date(delivery.expires_at) < new Date();
            const exhausted = delivery.download_count >= delivery.max_downloads;
            const available = !expired && !exhausted;

            return (
              <div key={delivery.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={22} className="text-accent-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{delivery.product?.name || 'Produto'}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Download size={12} /> {delivery.download_count}/{delivery.max_downloads} downloads
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Expira {formatDate(delivery.expires_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {available ? (
                      <a
                        href={delivery.product?.file_path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/digital-files/${delivery.product.file_path}?token=${delivery.download_token}` : '#'}
                        className="btn-primary"
                        download
                      >
                        <Download size={16} /> Descarregar
                      </a>
                    ) : expired ? (
                      <span className="badge bg-error-500/10 text-error-500">
                        <AlertCircle size={12} /> Expirado
                      </span>
                    ) : (
                      <span className="badge bg-warning-500/10 text-warning-500">
                        <AlertCircle size={12} /> Esgotado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Download size={40} className="text-text-muted mx-auto mb-4" />
          <h3 className="font-medium text-text-primary mb-2">Sem downloads disponíveis</h3>
          <p className="text-text-secondary text-sm">Os teus produtos digitais aparecerão aqui após o pagamento ser confirmado.</p>
        </div>
      )}
    </AccountLayout>
  );
}
