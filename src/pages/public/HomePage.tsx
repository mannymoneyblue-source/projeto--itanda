import { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, ArrowRight, Sparkles, ShieldCheck, Download, Headphones, Star } from 'lucide-react';
import { Link, useRouter } from '@/contexts/RouterContext';
import { fetchProducts, fetchCategories, fetchAverageRatings } from '@/services/api';
import { formatKz, truncate } from '@/utils/format';
import type { Product, Category } from '@/types';
import { ProductCard } from '@/components/ProductCard';

export function HomePage() {
  const { navigate } = useRouter();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  const [topRated, setTopRated] = useState<{ product: Product; avg: number; count: number }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetchProducts({ featuredOnly: true, limit: 4 }),
      fetchProducts({ limit: 8, sort: 'recent' }),
      fetchCategories(),
    ])
      .then(([f, r, c]) => {
        setFeatured(f);
        setRecent(r);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // precisa do catálogo carregado para escolher candidatos; ignora produtos sem avaliações
    if (loading) return;
    let cancelled = false;
    fetchProducts({ limit: 24 })
      .then(async (candidates) => {
        const ratings = await fetchAverageRatings(candidates.map((p) => p.id));
        if (cancelled) return;
        const ranked = candidates
          .map((p) => ({ product: p, ...(ratings[p.id] || { avg: 0, count: 0 }) }))
          .filter((x) => x.count > 0)
          .sort((a, b) => b.avg - a.avg || b.count - a.count)
          .slice(0, 4);
        setTopRated(ranked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/catalogo?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const benefits = [
    { icon: Download, title: 'Entrega imediata', desc: 'Recebe os teus produtos digitais após confirmação do pagamento.' },
    { icon: ShieldCheck, title: 'Pagamento seguro', desc: 'Métodos de pagamento confiáveis e verificação manual.' },
    { icon: Headphones, title: 'Apoio dedicado', desc: 'Suporte via WhatsApp para qualquer questão ou dúvida.' },
    { icon: Sparkles, title: 'Qualidade garantida', desc: 'Produtos digitais selecionados para profissionais.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-500/5 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm font-medium mb-6 animate-fade-in">
              <Sparkles size={14} /> Soluções digitais em Angola
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary leading-tight animate-fade-in-up">
              Descobre soluções digitais que simplificam o teu dia.
            </h1>
            <p className="mt-6 text-lg text-text-secondary leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Ferramentas, recursos e produtos digitais ao teu alcance.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="mt-8 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative flex items-center">
                <Search size={18} className="absolute left-4 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="O que procuras?"
                  className="w-full bg-surface-raised border border-border rounded-xl pl-12 pr-32 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all"
                />
                <button type="submit" className="absolute right-2 btn-primary !py-2 !px-5">
                  Pesquisar
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/catalogo?cat=${cat.id}`}
                className="flex-shrink-0 px-5 py-2.5 rounded-lg bg-surface-raised border border-border text-sm font-medium text-text-secondary hover:text-accent-400 hover:border-accent-500/30 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp size={22} className="text-accent-400" />
            <h2 className="font-display text-2xl font-bold">Em destaque</h2>
          </div>
          <Link to="/catalogo" className="flex items-center gap-1 text-sm text-accent-400 hover:text-accent-300 transition-colors">
            Ver tudo <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-80 skeleton" />
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-center py-12">Ainda não há produtos em destaque.</p>
        )}
      </section>

      {/* Top rated */}
      {topRated.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Star size={22} className="text-accent-400 fill-accent-400" />
              <h2 className="font-display text-2xl font-bold">Mais bem avaliados</h2>
            </div>
            <Link to="/catalogo" className="flex items-center gap-1 text-sm text-accent-400 hover:text-accent-300 transition-colors">
              Ver tudo <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {topRated.map(({ product, avg, count }) => (
              <ProductCard key={product.id} product={product} ratingAvg={avg} ratingCount={count} />
            ))}
          </div>
        </section>
      )}

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((benefit, i) => (
            <div key={i} className="card p-6 hover:border-border-strong transition-colors">
              <div className="w-12 h-12 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mb-4">
                <benefit.icon size={22} className="text-accent-400" />
              </div>
              <h3 className="font-semibold text-text-primary mb-1.5">{benefit.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Clock size={22} className="text-accent-400" />
            <h2 className="font-display text-2xl font-bold">Produtos recentes</h2>
          </div>
          <Link to="/catalogo" className="flex items-center gap-1 text-sm text-accent-400 hover:text-accent-300 transition-colors">
            Ver tudo <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card h-80 skeleton" />
            ))}
          </div>
        ) : recent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recent.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-center py-12">Ainda não há produtos disponíveis.</p>
        )}
      </section>
    </div>
  );
}
