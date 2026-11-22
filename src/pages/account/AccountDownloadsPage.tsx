import { useState, useEffect } from 'react';
import { Download, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AccountLayout } from '@/layouts/AccountLayout';
import { fetchMyDeliveries, requestDeliveryDownload } from '@/services/api';
import { formatKz, formatDate } from '@/utils/format';
import type { DigitalDelivery } from '@/types';

export function AccountDownloadsPage() {
  const [deliveries, setDeliveries] = useState<DigitalDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyDeliveries()
      .then(setDeliveries)
      .catch((error) => {
        console.error('Erro ao carregar entregas digitais:', error);
        setDownloadError('Não foi possível carregar os downloads. Atualiza a página e tenta novamente.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDownload(deliveryId: string) {
    setDownloadingId(deliveryId);
    setDownloadError(null);
    try {
      const signedUrl = await requestDeliveryDownload(deliveryId);
      window.location.assign(signedUrl);
    } catch (error) {
      console.error('Erro ao gerar download:', error);
      setDownloadError('Não foi possível iniciar o download. Verifica a tua ligação ou tenta novamente.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AccountLayout activePath="/conta/downloads">
      <h1 className="font-display text-2xl font-bold mb-6">Os meus downloads</h1>

      {downloadError && (
        <div role="alert" className="mb-4 rounded-lg bg-error-500/10 p-3 text-sm text-error-500">
          {downloadError}
        </div>
      )}

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
                      <button
                        type="button"
                        onClick={() => handleDownload(delivery.id)}
                        className="btn-primary"
                        disabled={downloadingId === delivery.id}
                      >
                        <Download size={16} /> {downloadingId === delivery.id ? 'A preparar...' : 'Descarregar'}
                      </button>
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
