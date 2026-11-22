import { useState } from 'react';
import { ArrowLeft, Check, CreditCard, FileText, Lock, Copy, Upload, Landmark, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useRouter } from '@/contexts/RouterContext';
import { createOrder, createPayment, uploadPaymentProof, attachPaymentProof } from '@/services/api';
import { formatKz, paymentMethodLabel } from '@/utils/format';
import type { PaymentMethod } from '@/types';

const BANK_IBAN = '0006000082202756301';
const BANK_IBAN_FORMATTED = '0006 0000 82202756301 97';
const BANK_NAME = 'Banco Ĉitanda';

export function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [step, setStep] = useState<'info' | 'payment' | 'confirmation'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !name.trim()) {
      setError('Preencha o nome e email.');
      return;
    }
    setStep('payment');
  };

  const handleCopyIban = async () => {
    try {
      await navigator.clipboard.writeText(BANK_IBAN);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProofError('O ficheiro não pode exceder 5 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setProofError('Formato aceites: JPG, PNG ou PDF.');
      return;
    }
    setProofFile(file);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Create the order
      const newOrderId = await createOrder({
        items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        customer_email: email,
        customer_name: name,
        customer_phone: phone || undefined,
        notes: notes || undefined,
        is_guest: !user,
      });

      // 2. Create the pending payment
      const payment = await createPayment({
        order_id: newOrderId,
        method: paymentMethod,
        amount: totalPrice,
        reference: paymentRef || undefined,
      });

      // 3. Upload proof if provided (only for transfer)
      if (paymentMethod === 'transfer' && proofFile && payment) {
        const proofPath = await uploadPaymentProof(proofFile, newOrderId);
        await attachPaymentProof(payment.id, proofPath);
      }

      // Only show success if the order was really created
      if (!newOrderId) {
        throw new Error('Não foi possível criar a encomenda.');
      }

      setOrderId(newOrderId);
      setOrderRef(`CIT-${newOrderId.slice(0, 8).toUpperCase()}`);
      clearCart();
      setStep('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar encomenda.');
    } finally {
      setLoading(false);
    }
  };

  // Empty cart guard
  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mx-auto mb-4">
          <FileText size={28} className="text-text-muted" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Carrinho vazio</h1>
        <p className="text-text-secondary mb-6">Adiciona produtos ao carrinho antes de finalizar a compra.</p>
        <Link to="/catalogo" className="btn-primary">Ver catálogo</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/catalogo" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-400 transition-colors mb-6">
        <ArrowLeft size={16} /> Continuar compras
      </Link>

      <h1 className="font-display text-3xl font-bold mb-8">Checkout</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { key: 'info', label: 'Dados' },
          { key: 'payment', label: 'Pagamento' },
          { key: 'confirmation', label: 'Confirmação' },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s.key || (step === 'confirmation' && s.key === 'payment') || (step === 'payment' && s.key === 'info')
                ? 'bg-accent-500 text-base-900'
                : 'bg-surface-raised text-text-muted'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm ${step === s.key ? 'text-text-primary font-medium' : 'text-text-muted'}`}>{s.label}</span>
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Step: Info */}
          {step === 'info' && (
            <form onSubmit={handleInfoSubmit} className="card p-6 space-y-4 animate-fade-in">
              <h2 className="font-display text-xl font-semibold mb-2">Dados do cliente</h2>

              {!user && (
                <div className="p-3 rounded-lg bg-accent-500/5 border border-accent-500/20 text-sm text-text-secondary">
                  Estás a comprar como convidado. <Link to="/login" className="text-accent-400 hover:underline">Entra na tua conta</Link> para acompanhar a encomenda.
                </div>
              )}

              <div>
                <label className="label">Nome completo *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" />
              </div>
              <div>
                <label className="label">Notas (opcional)</label>
                <textarea className="input min-h-[80px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais sobre a encomenda..." />
              </div>

              {error && <p className="text-sm text-error-500">{error}</p>}

              <button type="submit" className="btn-primary w-full">Continuar para pagamento</button>
            </form>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <form onSubmit={handlePaymentSubmit} className="card p-6 space-y-5 animate-fade-in">
              <h2 className="font-display text-xl font-semibold mb-2">Método de pagamento</h2>

              <div className="space-y-3">
                {(['transfer', 'reference'] as PaymentMethod[]).map((method) => (
                  <label
                    key={method}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      paymentMethod === method ? 'border-accent-500/50 bg-accent-500/5' : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="accent-accent-500"
                    />
                    <CreditCard size={20} className={paymentMethod === method ? 'text-accent-400' : 'text-text-muted'} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{paymentMethodLabel[method]}</p>
                      <p className="text-xs text-text-muted">
                        {method === 'transfer' ? 'Faz a transferência e envia o comprovativo.' : 'Usa a referência gerada para pagar.'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Bank details for transfer */}
              {paymentMethod === 'transfer' && (
                <div className="p-4 rounded-lg bg-surface-hover border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Landmark size={18} className="text-accent-400" />
                    <h3 className="font-semibold text-sm text-text-primary">Dados para transferência</h3>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted mb-1">Banco</p>
                    <p className="text-sm font-medium text-text-primary">{BANK_NAME}</p>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted mb-1">IBAN</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-text-primary bg-base-800 px-3 py-2 rounded-lg flex-1 select-all">
                        {BANK_IBAN_FORMATTED}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyIban}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
                          copied ? 'bg-success-500/20 text-success-500' : 'bg-base-800 text-text-secondary hover:text-text-primary'
                        }`}
                        title="Copiar IBAN"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted mb-1">Valor a transferir</p>
                    <p className="font-display text-xl font-bold text-accent-400">{formatKz(totalPrice)}</p>
                  </div>

                  <div className="text-xs text-text-secondary leading-relaxed border-t border-border pt-3">
                    <p className="font-medium text-text-primary mb-1">Instruções:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Faz a transferência do valor exato para o IBAN indicado.</li>
                      <li>Na descrição da transferência, indica a referência da encomenda (será gerada após confirmares).</li>
                      <li>Envia o comprovativo abaixo ou mais tarde através da tua conta.</li>
                      <li>O acesso aos produtos digitais é liberado após a confirmação do pagamento.</li>
                    </ol>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Referência / comprovativo (opcional)</label>
                <input className="input" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Referência de pagamento ou número de comprovativo" />
                <p className="text-xs text-text-muted mt-1.5">O pagamento será confirmado manualmente pela equipa Ĉitanda.</p>
              </div>

              {/* Proof upload (transfer only) */}
              {paymentMethod === 'transfer' && (
                <div>
                  <label className="label">Comprovativo de transferência</label>
                  <label className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-border hover:border-accent-500/50 cursor-pointer transition-colors">
                    <Upload size={18} className="text-text-muted" />
                    <span className="text-sm text-text-secondary flex-1">
                      {proofFile ? proofFile.name : 'Anexar imagem ou PDF do comprovativo (opcional)'}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleProofChange} />
                  </label>
                  {proofError && <p className="text-xs text-error-500 mt-1.5">{proofError}</p>}
                </div>
              )}

              <div className="p-3 rounded-lg bg-surface-hover text-sm text-text-secondary flex items-start gap-2">
                <Lock size={16} className="text-text-muted flex-shrink-0 mt-0.5" />
                Os teus dados estão seguros. O pagamento só é confirmado após verificação.
              </div>

              {error && <p className="text-sm text-error-500">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('info')} className="btn-secondary flex-1">Voltar</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'A processar...' : 'Confirmar encomenda'}
                </button>
              </div>
            </form>
          )}

          {/* Step: Confirmation */}
          {step === 'confirmation' && orderId && (
            <div className="card p-8 text-center animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-success-500/10 border border-success-500/20 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-success-500" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Encomenda registada!</h2>
              <p className="text-text-secondary mb-1">Recebemos a tua encomenda com sucesso.</p>
              <p className="text-sm text-text-muted mb-6">
                Número da encomenda: <span className="font-mono text-text-primary">{orderRef}</span>
              </p>

              {paymentMethod === 'transfer' && (
                <div className="p-5 rounded-lg bg-surface-hover border border-border text-left mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark size={18} className="text-accent-400" />
                    <h3 className="font-semibold text-sm text-text-primary">Próximo passo: efetuar a transferência</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-text-muted">IBAN:</span>
                      <code className="font-mono text-text-primary">{BANK_IBAN_FORMATTED}</code>
                      <button
                        type="button"
                        onClick={handleCopyIban}
                        className={`p-1.5 rounded-md transition-colors ${copied ? 'bg-success-500/20 text-success-500' : 'bg-base-800 text-text-secondary hover:text-text-primary'}`}
                        title="Copiar IBAN"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-text-muted">Valor:</span>
                      <span className="font-semibold text-accent-400">{formatKz(totalPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-text-muted">Referência:</span>
                      <code className="font-mono text-text-primary">{orderRef}</code>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border text-xs text-text-secondary leading-relaxed">
                    <p className="flex items-start gap-1.5">
                      <ShieldCheck size={14} className="text-success-500 flex-shrink-0 mt-0.5" />
                      Após fazeres a transferência, a equipa Ĉitanda irá verificar o comprovativo e confirmar o pagamento. Assim que confirmado, receberás acesso aos ficheiros digitais{user ? ' na tua conta' : ' por email'}.
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod !== 'transfer' && (
                <div className="p-4 rounded-lg bg-surface-hover text-sm text-text-secondary mb-6 text-left">
                  O pagamento será confirmado manualmente. Assim que for validado, receberás acesso aos ficheiros digitais{user ? ' na tua conta' : ' por email'}.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/" className="btn-secondary">Voltar à loja</Link>
                {user && <Link to="/conta/encomendas" className="btn-primary">Ver minhas encomendas</Link>}
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        {step !== 'confirmation' && (
          <div className="lg:col-span-1">
            <div className="card p-5 sticky top-20">
              <h3 className="font-semibold mb-4">Resumo da encomenda</h3>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-base-600 flex-shrink-0 overflow-hidden">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText size={16} className="text-text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-text-muted">{item.quantity}x {formatKz(item.product.price)}</p>
                    </div>
                    <span className="text-sm font-medium">{formatKz(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Total</span>
                  <span className="font-display font-bold text-xl">{formatKz(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
