import { Mail, Phone, MessageCircle } from 'lucide-react';
import { Link } from '@/contexts/RouterContext';
import { Logo } from '@/components/Logo';

const WHATSAPP_NUMBER = '244935995757';

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-base-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 text-sm text-text-secondary max-w-sm leading-relaxed">
              Soluções digitais mais perto de ti. Ferramentas, recursos e produtos digitais
              ao teu alcance, pensados para o mercado angolano.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {WHATSAPP_NUMBER && (
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success-500/10 border border-success-500/20 text-success-500 text-sm font-medium hover:bg-success-500/20 transition-colors"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Navegação</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-text-secondary hover:text-accent-400 transition-colors">Início</Link></li>
              <li><Link to="/catalogo" className="text-sm text-text-secondary hover:text-accent-400 transition-colors">Catálogo</Link></li>
              <li><Link to="/sobre" className="text-sm text-text-secondary hover:text-accent-400 transition-colors">Sobre</Link></li>
              <li><Link to="/contacto" className="text-sm text-text-secondary hover:text-accent-400 transition-colors">Contacto</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail size={16} className="text-text-muted" /> apoio@citanda.ao
              </li>
              <li className="flex items-center gap-2 text-sm text-text-secondary">
                <Phone size={16} className="text-text-muted" /> +244 935 995 757
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Ĉitanda. Todos os direitos reservados.
          </p>
          <p className="text-xs text-text-muted">Soluções digitais mais perto de ti.</p>
        </div>
      </div>
    </footer>
  );
}
