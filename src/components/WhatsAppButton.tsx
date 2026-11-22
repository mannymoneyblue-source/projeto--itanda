import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

export function WhatsAppButton({ productName }: { productName?: string }) {
  const defaultMessage = productName
    ? `Olá! Tenho interesse no produto "${productName}" da Ĉitanda. Podem fornecer mais informações?`
    : 'Olá! Entrei na Ĉitanda e gostaria de obter mais informações.';

  return (
    <a
      href={buildWhatsAppUrl(defaultMessage)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-success-500 hover:bg-success-600 text-white shadow-lg shadow-success-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
      aria-label="Contactar via WhatsApp"
    >
      <MessageCircle size={26} />
      <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-sm text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Fala connosco
      </span>
    </a>
  );
}
