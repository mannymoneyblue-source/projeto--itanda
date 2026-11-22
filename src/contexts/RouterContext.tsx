import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type RouteContextValue = {
  path: string;
  navigate: (to: string) => void;
};

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a[data-link]');
      if (target) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href) navigate(href);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <RouteContext.Provider value={{ path, navigate }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

interface LinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Link({ to, children, className, onClick }: LinkProps) {
  return (
    <a href={to} data-link className={className} onClick={onClick}>
      {children}
    </a>
  );
}
