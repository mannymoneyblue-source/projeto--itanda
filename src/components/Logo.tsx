import { Store } from 'lucide-react';
import { Link } from '@/contexts/RouterContext';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="relative flex items-center justify-center rounded-lg bg-accent-500/10 border border-accent-500/20 group-hover:bg-accent-500/20 transition-colors" style={{ width: iconSize + 12, height: iconSize + 12 }}>
        <Store size={iconSize} className="text-accent-400" />
      </div>
      <span className={`font-display font-bold ${textSize} text-text-primary tracking-tight`}>
        Ĉitanda
      </span>
    </Link>
  );
}
