import { useState, useEffect } from 'react';
import { FileText, ShoppingCart, Check, ArrowLeft, Download, ShieldCheck, Zap, ExternalLink, Store, MessageSquare, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { fetchProductBySlug, fetchProducts, fetchProductExternalLinks } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { Link, useRouter } from '@/contexts/RouterContext';
import { formatKz } from '@/utils/format';
import { ProductCard } from '@/components/ProductCard';
import { ReviewSection } from '@/components/ReviewSection';
import type { Product, ExternalProductLink } from '@/types';

const LINK_LABELS: Record<string, string> = {
  buy: 'Comprar',
  supplier: 'Fornecedor',
  demo: 'Demonstração',
  docs: 'Documentação',
  presentation: 'Apresentação',
};

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalProductLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchProductBySlug(slug)
      .then((p) => {
        setProduct(p);
        if (p) {
          if (p.category_id) {
            fetchProducts({ categoryId: p.category_id, limit: 4 })
              .then((items) => setRelated(items.filter((item) => item.id !== p.id).slice(0, 3)))
              .catch(() => {});
          }
          if (p.product_type === 'external') {
            fetchProductExternalLinks(p.id).then(setExternalLinks).catch(() => {});
          }
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAdd = () => {
    if (!product) return;
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addItem(product);
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square rounded-xl skeleton" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-6 w-1/2 skeleton" />
            <div className="h-32 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <FileText size={48} className="text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Produto não encontrado</h1>
        <p className="text-text-secondary mb-6">O produto que procuras não existe ou foi removido.</p>
        <Link to="/catalogo" className="btn-primary">Ver catálogo</Link>
      </div>
    );
  }

  const isExternal = product.product_type === 'external';
  const buyUrl = product.external_url || externalLinks.find((l) => l.link_type === 'buy')?.url;
  const whatsappUrl = buildWhatsAppUrl(
    `Olá! Tenho interesse no produto "${product.name}" da Ĉitanda. Podem fornecer mais informações?`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link to="/catalogo" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-400 transition-colors mb-6">
        <ArrowLeft size={16} /> Voltar ao catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-base-600 border border-border">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText size={64} className="text-text-muted" />
            </div>
          )}
          {product.is_featured && (
            <span className="absolute top-4 left-4 badge bg-accent-500/90 text-base-900 font-semibold">
              <Zap size={12} /> Destaque
            </span>
          )}
          {isExternal && (
            <span className="absolute top-4 right-4 badge bg-surface-raised/90 text-text-secondary border border-border">
              <Store size={12} /> Produto de terceiros
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.category && (
            <span className="text-sm text-accent-400 mb-2">{product.category.name}</span>
          )}
          <h1 className="font-display text-3xl font-bold text-text-primary leading-tight">{product.name}</h1>

          {isExternal && product.supplier_name && (
            <p className="mt-2 text-sm text-text-muted flex items-center gap-1.5">
              <Store size={14} /> Fornecedor: {product.supplier_name}
            </p>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-accent-400">{formatKz(product.price)}</span>
            {!isExternal && (
              <span className="badge bg-success-500/10 text-success-500">
                <Check size={12} /> Disponível
              </span>
            )}
          </div>

          <p className="mt-6 text-text-secondary leading-relaxed">{product.description}</p>

          {product.details && (
            <div className="mt-6 card p-5">
              <h3 className="font-semibold text-text-primary mb-3">Detalhes</h3>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{product.details}</p>
            </div>
          )}

          {/* External links */}
          {externalLinks.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {externalLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost !py-2 !px-4 text-sm"
                >
                  <ExternalLink size={14} /> {link.label || LINK_LABELS[link.link_type] || 'Link'}
                </a>
              ))}
            </div>
          )}

          {/* Features */}
          {!isExternal && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                  <Download size={16} className="text-accent-400" />
                </div>
                Entrega digital imediata
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={16} className="text-accent-400" />
                </div>
                Pagamento seguro
              </div>
            </div>
          )}

          {isExternal && (
            <div className="mt-6 p-4 rounded-lg bg-surface-hover border border-border-subtle">
              <p className="text-sm text-text-secondary leading-relaxed">
                Este produto é comercializado por um parceiro externo. Ao clicar, serás direcionado para o website do fornecedor, onde podes concluir a compra.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center justify-center gap-2 !text-success-500 hover:!border-success-500/40 hover:!bg-success-500/10"
              aria-label="Pedir informações via WhatsApp"
            >
              <MessageCircle size={18} /> <span className="hidden sm:inline">Pedir informações no WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
            {isExternal ? (
              buyUrl ? (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} /> Comprar no fornecedor
                </a>
              ) : (
                <div className="flex-1 p-4 rounded-lg bg-surface-hover border border-border text-center text-sm text-text-muted">
                  Link externo indisponível
                </div>
              )
            ) : (
              <>
                <button onClick={handleBuyNow} className="btn-primary flex-1">
                  Comprar agora
                </button>
                <button onClick={handleAdd} className="btn-secondary flex-1">
                  {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                  {added ? 'Adicionado!' : 'Adicionar ao carrinho'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ReviewSection productId={product.id} />

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-bold mb-6">Produtos relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
