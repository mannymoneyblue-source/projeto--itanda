import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, FolderTree } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { fetchCategories } from '@/services/api';
import { slugify, formatDateShort } from '@/utils/format';
import type { Category } from '@/types';
import { supabase } from '@/lib/supabase';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = () => {
    setLoading(true);
    fetchCategories().then(setCategories).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminar a categoria "${name}"?`)) return;
    try {
      await deleteCategory(id);
      load();
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : ''));
    }
  };

  return (
    <AdminLayout activePath="/admin/categorias">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Categorias</h1>
          <p className="text-sm text-text-secondary">{categories.length} categoria(s)</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                    <FolderTree size={18} className="text-accent-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{cat.name}</h3>
                    <p className="text-xs text-text-muted font-mono">{cat.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setEditing(cat); setShowForm(true); }} className="p-1.5 rounded hover:bg-surface-hover">
                    <Edit2 size={15} className="text-text-secondary" />
                  </button>
                  <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 rounded hover:bg-error-500/10">
                    <Trash2 size={15} className="text-text-secondary hover:text-error-500" />
                  </button>
                </div>
              </div>
              {cat.description && <p className="text-sm text-text-secondary mt-3">{cat.description}</p>}
              <p className="text-xs text-text-muted mt-3">Criada {formatDateShort(cat.created_at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <FolderTree size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">Sem categorias.</p>
        </div>
      )}

      {showForm && (
        <CategoryForm
          category={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </AdminLayout>
  );
}

async function createCategory(params: { name: string; slug: string; description?: string }): Promise<void> {
  const { error } = await supabase.from('categories').insert(params);
  if (error) throw error;
}

async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const { error } = await supabase.from('categories').update(updates).eq('id', id);
  if (error) throw error;
}

async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

function CategoryForm({ category, onClose, onSaved }: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Nome obrigatório.'); return; }
    setLoading(true);
    try {
      const slug = slugify(name);
      if (category) {
        await updateCategory(category.id, { name, slug, description: description || undefined });
      } else {
        await createCategory({ name, slug, description: description || undefined });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display text-xl font-bold">{category ? 'Editar categoria' : 'Nova categoria'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea className="input min-h-[80px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-sm text-error-500">{error}</p>}
          <div className="flex gap-3">
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
