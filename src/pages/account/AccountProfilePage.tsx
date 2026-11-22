import { useState } from 'react';
import { User, Mail, Phone, Save, Check } from 'lucide-react';
import { AccountLayout } from '@/layouts/AccountLayout';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/api';

export function AccountProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateProfile({ full_name: fullName, phone });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountLayout activePath="/conta/perfil">
      <h1 className="font-display text-2xl font-bold mb-6">Perfil</h1>

      <form onSubmit={handleSave} className="card p-6 max-w-lg space-y-4">
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input className="input pl-10 opacity-60" value={profile?.email || ''} disabled />
          </div>
          <p className="text-xs text-text-muted mt-1">O email não pode ser alterado.</p>
        </div>

        <div>
          <label className="label">Nome completo</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input className="input pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Telefone</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input className="input pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" />
          </div>
        </div>

        {error && <p className="text-sm text-error-500">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'A guardar...' : saved ? <><Check size={16} /> Guardado!</> : <><Save size={16} /> Guardar alterações</>}
        </button>
      </form>
    </AccountLayout>
  );
}
