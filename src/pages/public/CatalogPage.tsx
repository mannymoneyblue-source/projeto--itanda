import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { fetchProducts, fetchCategories } from '@/services/api';
import { ProductCard } from '@/components/ProductCard';
import { useRouter } from '@/contexts/RouterContext';
import type { Product, Category } from '@/types';

export function CatalogPage() {
  const { path } = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const params = new URLSearchParams(path.split('?')[1] || '');
  const [search, setSearch] = useState(params.get('q') || '');
  const [categoryId, setCategoryId] = useState(params.get('cat') || '');
  const [sort, setSort] = useState<'recent' | 'price_asc' | 'price_desc' | 'name'>('recent');

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchProducts({
      search: search || undefined,
      categoryId: categoryId || undefined,
      sort,
      limit: 50,
    })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search, categoryId, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">Catálogo</h1>
        <p className="text-text-secondary">Explora todos os produtos digitais disponíveis.</p>
      </div>

      {/* Search + sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar produtos..."
            className="input pl-10"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="input sm:w-48 cursor-pointer"
        >
          <option value="recent">Mais recentes</option>
          <option value="price_asc">Preço: menor</option>
          <option value="price_desc">Preço: maior</option>
          <option value="name">Nome (A-Z)</option>
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary sm:hidden"
        >
          <SlidersHorizontal size={16} /> Filtros
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters */}
        <aside className={`w-56 flex-shrink-0 ${showFilters ? 'fixed inset-0 z-50 bg-base-900 p-6 overflow-y-auto' : 'hidden'} sm:block sm:static sm:z-auto sm:p-0`}>
          {showFilters && (
            <div className="flex items-center justify-between mb-4 sm:hidden">
              <h3 className="font-semibold">Filtros</h3>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg hover:bg-surface-hover">
                <X size={20} />
              </button>
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Categorias</h3>
            <button
              onClick={() => { setCategoryId(''); setShowFilters(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !categoryId ? 'bg-accent-500/10 text-accent-400' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setCategoryId(cat.id); setShowFilters(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  categoryId === cat.id ? 'bg-accent-500/10 text-accent-400' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card h-80 skeleton" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-sm text-text-muted mb-4">{products.length} produto(s) encontrado(s)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={40} className="text-text-muted mb-4" />
              <p className="text-text-secondary">Nenhum produto encontrado.</p>
              <button
                onClick={() => { setSearch(''); setCategoryId(''); }}
                className="btn-ghost mt-4"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
