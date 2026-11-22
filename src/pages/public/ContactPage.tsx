import { useState } from 'react';
import { Mail, Phone, MessageCircle, Send, Check } from 'lucide-react';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    // In production this would send to a backend; for now we show confirmation
    setSent(true);
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-bold mb-4">Contacta-nos</h1>
        <p className="text-lg text-text-secondary">Estamos aqui para ajudar. Escolhe o canal que preferires.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact info */}
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center">
                <Mail size={20} className="text-accent-400" />
              </div>
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="text-sm text-text-secondary">apoio@citanda.ao</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center">
                <Phone size={20} className="text-accent-400" />
              </div>
              <div>
                <h3 className="font-semibold">Telefone</h3>
                <p className="text-sm text-text-secondary">+244 900 000 000</p>
              </div>
            </div>
          </div>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-6 block hover:border-success-500/30 transition-colors group"
          >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-500/10 flex items-center justify-center">
                  <MessageCircle size={20} className="text-success-500" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-success-500 transition-colors">WhatsApp</h3>
                  <p className="text-sm text-text-secondary">Fala connosco diretamente</p>
                </div>
              </div>
            </a>
          </div>

        {/* Contact form */}
        <div className="card p-6">
          <h3 className="font-display text-xl font-semibold mb-4">Envia uma mensagem</h3>
          {sent ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in-up">
              <div className="w-14 h-14 rounded-full bg-success-500/10 border border-success-500/20 flex items-center justify-center mb-4">
                <Check size={28} className="text-success-500" />
              </div>
              <p className="font-medium text-text-primary">Mensagem enviada!</p>
              <p className="text-sm text-text-secondary mt-1">Entraremos em contacto em breve.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Mensagem *</label>
                <textarea className="input min-h-[120px] resize-none" value={message} onChange={(e) => setMessage(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary w-full">
                <Send size={16} /> Enviar mensagem
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
