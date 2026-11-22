import { X, Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from '@/contexts/RouterContext';
import { formatKz } from '@/utils/format';

export function CartDrawer() {
  const { items, isCartOpen, closeCart, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const { navigate } = useRouter();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-fade-in"
        onClick={closeCart}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border z-[70] flex flex-col animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-accent-400" />
            <h2 className="font-display font-semibold text-lg">Carrinho</h2>
            {totalItems > 0 && (
              <span className="badge bg-accent-500/10 text-accent-400">{totalItems}</span>
            )}
          </div>
          <button onClick={closeCart} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center">
                <ShoppingBag size={28} className="text-text-muted" />
              </div>
              <p className="text-text-secondary">O teu carrinho está vazio</p>
              <button onClick={closeCart} className="btn-primary mt-2">Continuar compras</button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 p-3 card-raised">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg bg-base-600 flex-shrink-0 overflow-hidden">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={20} className="text-text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-text-primary truncate">{item.product.name}</h4>
                    <p className="text-xs text-text-muted mt-0.5">{formatKz(item.product.price)}</p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 rounded text-text-muted hover:text-error-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-text-primary">{formatKz(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Total</span>
              <span className="font-display font-bold text-xl text-text-primary">{formatKz(totalPrice)}</span>
            </div>
            <button onClick={handleCheckout} className="btn-primary w-full">
              Finalizar compra
            </button>
          </div>
        )}
      </div>
    </>
  );
}
