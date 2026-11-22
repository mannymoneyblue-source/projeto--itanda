import { ShoppingCart, Check, FileText, Zap, ExternalLink, Store, Star } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatKz, truncate } from '@/utils/format';
import { Link } from '@/contexts/RouterContext';
import type { Product } from '@/types';
import { useState } from 'react';

export function ProductCard({ product, ratingAvg, ratingCount }: { product: Product; ratingAvg?: number; ratingCount?: number }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const isExternal = product.product_type === 'external';

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.external_url) {
      window.open(product.external_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Link to={`/produto/${product.slug}`} className="group card overflow-hidden hover:border-border-strong transition-all duration-200 hover:shadow-lg hover:shadow-black/20 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-base-600 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText size={32} className="text-text-muted" />
          </div>
        )}
        {product.is_featured && (
          <span className="absolute top-3 left-3 badge bg-accent-500/90 text-base-900 font-semibold">
            <Zap size={12} /> Destaque
          </span>
        )}
        {isExternal && (
          <span className="absolute top-3 right-3 badge bg-surface-raised/90 text-text-secondary border border-border">
            <Store size={12} /> Terceiro
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        {product.category && (
          <span className="text-xs text-text-muted mb-1.5">{product.category.name}</span>
        )}
        <h3 className="font-medium text-text-primary group-hover:text-accent-400 transition-colors line-clamp-2">
          {product.name}
        </h3>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed line-clamp-2 flex-1">
          {truncate(product.description, 80)}
        </p>

        {isExternal && product.supplier_name && (
          <p className="mt-2 text-xs text-text-muted flex items-center gap-1">
            <Store size={12} /> {product.supplier_name}
          </p>
        )}

        {ratingAvg !== undefined && ratingCount !== undefined && ratingCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={12}
                  className={s <= Math.round(ratingAvg) ? 'text-accent-400 fill-accent-400' : 'text-text-muted'}
                />
              ))}
            </div>
            <span className="text-xs text-text-muted">{ratingAvg.toFixed(1)} ({ratingCount})</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="font-display font-bold text-lg text-text-primary">{formatKz(product.price)}</span>
          {isExternal ? (
            <button
              onClick={handleExternal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-surface-hover text-text-secondary hover:bg-accent-500 hover:text-base-900 transition-all"
            >
              <ExternalLink size={16} /> Ver produto
            </button>
          ) : (
            <button
              onClick={handleAdd}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                added
                  ? 'bg-success-500/20 text-success-500'
                  : 'bg-surface-hover text-text-secondary hover:bg-accent-500 hover:text-base-900'
              }`}
            >
              {added ? <Check size={16} /> : <ShoppingCart size={16} />}
              {added ? 'Adicionado' : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
