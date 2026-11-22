import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, FileText, Search, ToggleLeft, ToggleRight, Star, StarOff, Package, Store } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { fetchAllProducts, fetchCategories, createProduct, updateProduct, deleteProduct } from '@/services/api';
import { formatKz, slugify } from '@/utils/format';
import { supabase } from '@/lib/supabase';
import type { Product, Category } from '@/types';

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([fetchAllProducts(), fetchCategories()])
      .then(([p, c]) => { setProducts(p); setCategories(c); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tens a certeza que queres eliminar "${name}"?`)) return;
    try {
      await deleteProduct(id);
      load();
    } catch (err) {
      alert('Erro ao eliminar: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await updateProduct(product.id, { is_active: !product.is_active });
      load();
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      await updateProduct(product.id, { is_featured: !product.is_featured });
      load();
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout activePath="/admin/produtos">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Produtos</h1>
          <p className="text-sm text-text-secondary">{products.length} produto(s) no total</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
          <Plus size={16} /> Novo produto
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input className="input pl-10" placeholder="Pesquisar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((product) => (
            <div key={product.id} className="card p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-base-600 flex-shrink-0 overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText size={20} className="text-text-muted" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate flex items-center gap-1.5">{product.name}{product.product_type === 'external' && <Store size={14} className="text-text-muted" />}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-accent-400 font-medium">{formatKz(product.price)}</span>
                  {product.category && <span className="text-xs text-text-muted">· {product.category.name}</span>}
                  {product.product_type === 'external' && <span className="text-xs text-text-muted">· {product.supplier_name || 'Terceiro'}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleToggleFeatured(product)} className="p-2 rounded-lg hover:bg-surface-hover transition-colors" title={product.is_featured ? 'Remover destaque' : 'Destacar'}>
                  {product.is_featured ? <Star size={18} className="text-accent-400 fill-accent-400" /> : <StarOff size={18} className="text-text-muted" />}
                </button>
                <button onClick={() => handleToggleActive(product)} className="p-2 rounded-lg hover:bg-surface-hover transition-colors" title={product.is_active ? 'Desativar' : 'Ativar'}>
                  {product.is_active ? <ToggleRight size={22} className="text-success-500" /> : <ToggleLeft size={22} className="text-text-muted" />}
                </button>
                <button onClick={() => { setEditing(product); setShowForm(true); }} className="p-2 rounded-lg hover:bg-surface-hover transition-colors">
                  <Edit2 size={16} className="text-text-secondary" />
                </button>
                <button onClick={() => handleDelete(product.id, product.name)} className="p-2 rounded-lg hover:bg-error-500/10 transition-colors">
                  <Trash2 size={16} className="text-text-secondary hover:text-error-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Package size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">Sem produtos.</p>
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </AdminLayout>
  );
}

function ProductForm({ product, categories, onClose, onSaved }: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(String(product?.price || ''));
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  const [details, setDetails] = useState(product?.details || '');
  const [filePath, setFilePath] = useState(product?.file_path || '');
  const [fileName, setFileName] = useState(product?.file_name || '');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [productType, setProductType] = useState<'own' | 'external'>(product?.product_type || 'own');
  const [supplierName, setSupplierName] = useState(product?.supplier_name || '');
  const [externalUrl, setExternalUrl] = useState(product?.external_url || '');
  const [partnershipType, setPartnershipType] = useState(product?.partnership_type || '');
  const [commission, setCommission] = useState(String(product?.commission || ''));
  const [externalProductId, setExternalProductId] = useState(product?.external_product_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !description.trim()) {
      setError('Nome e descrição são obrigatórios.');
      return;
    }

    const priceNum = parseInt(price) || 0;
    if (priceNum < 0) {
      setError('O preço não pode ser negativo.');
      return;
    }

    setLoading(true);
    try {
      if (productType === 'external' && externalUrl && !externalUrl.startsWith('https://')) {
        setError('O link externo deve usar HTTPS (https://).');
        setLoading(false);
        return;
      }

      const slug = slugify(name);
      const params = {
        name,
        slug,
        description,
        price: priceNum,
        category_id: categoryId || null,
        image_url: imageUrl || null,
        details: details || null,
        file_path: productType === 'external' ? null : (filePath || null),
        file_name: productType === 'external' ? null : (fileName || null),
        is_active: isActive,
        is_featured: isFeatured,
        product_type: productType,
        supplier_name: productType === 'external' ? (supplierName || null) : null,
        external_url: productType === 'external' ? (externalUrl || null) : null,
        partnership_type: productType === 'external' ? (partnershipType || null) : null,
        commission: productType === 'external' && commission ? parseFloat(commission) : null,
        external_product_id: productType === 'external' ? (externalProductId || null) : null,
      };

      if (product) {
        await updateProduct(product.id, params);
      } else {
        await createProduct(params);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);
      setImageUrl(publicUrl);
    } catch (err) {
      setError('Erro ao carregar imagem: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const path = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('digital-files')
        .upload(path, file);
      if (uploadError) throw uploadError;
      setFilePath(path);
      setFileName(file.name);
    } catch (err) {
      setError('Erro ao carregar ficheiro: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="font-display text-xl font-bold">{product ? 'Editar produto' : 'Novo produto'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Preço (Kz) *</label>
              <input type="number" min="0" className="input" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Descrição *</label>
            <textarea className="input min-h-[80px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>

          <div>
            <label className="label">Detalhes (opcional)</label>
            <textarea className="input min-h-[60px] resize-none" value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>

          {/* Product type selector */}
          <div>
            <label className="label">Tipo de produto</label>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${productType === 'own' ? 'border-accent-500/50 bg-accent-500/5 text-accent-400' : 'border-border text-text-secondary hover:border-border-strong'}`}>
                <input type="radio" name="productType" value="own" checked={productType === 'own'} onChange={() => setProductType('own')} className="accent-accent-500" />
                <span className="text-sm font-medium">Produto próprio</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${productType === 'external' ? 'border-accent-500/50 bg-accent-500/5 text-accent-400' : 'border-border text-text-secondary hover:border-border-strong'}`}>
                <input type="radio" name="productType" value="external" checked={productType === 'external'} onChange={() => setProductType('external')} className="accent-accent-500" />
                <span className="text-sm font-medium">Produto de terceiros</span>
              </label>
            </div>
          </div>

          {/* External product fields */}
          {productType === 'external' && (
            <div className="space-y-4 p-4 rounded-lg bg-surface-hover border border-border-subtle">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nome do fornecedor</label>
                  <input className="input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Ex: TechStore Angola" />
                </div>
                <div>
                  <label className="label">Tipo de parceria</label>
                  <select className="input" value={partnershipType} onChange={(e) => setPartnershipType(e.target.value)}>
                    <option value="">Sem parceria</option>
                    <option value="reseller">Revenda</option>
                    <option value="affiliate">Afiliado</option>
                    <option value="partner">Parceiro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Link externo (HTTPS) *</label>
                <input className="input" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://fornecedor.com/produto" />
                <p className="text-xs text-text-muted mt-1">O botão “Ver produto” irá abrir este link numa nova janela.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Comissão (%)</label>
                  <input type="number" step="0.01" min="0" max="100" className="input" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="Ex: 10" />
                </div>
                <div>
                  <label className="label">ID externo (opcional)</label>
                  <input className="input" value={externalProductId} onChange={(e) => setExternalProductId(e.target.value)} placeholder="ID no sistema do fornecedor" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="label">Imagem do produto</label>
            <div className="flex items-center gap-3">
              {imageUrl && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-base-600 flex-shrink-0">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <label className="btn-secondary cursor-pointer">
                <Plus size={16} /> Carregar imagem
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <input className="input mt-2" placeholder="ou URL da imagem" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>

          {productType === 'own' && (
            <div>
              <label className="label">Ficheiro digital</label>
              <div className="flex items-center gap-3">
                {fileName && <span className="text-sm text-text-secondary truncate flex-1">{fileName}</span>}
                <label className="btn-secondary cursor-pointer">
                  <Plus size={16} /> Carregar ficheiro
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-accent-500" />
              <span className="text-sm">Ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-accent-500" />
              <span className="text-sm">Destaque</span>
            </label>
          </div>

          {error && <p className="text-sm text-error-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
