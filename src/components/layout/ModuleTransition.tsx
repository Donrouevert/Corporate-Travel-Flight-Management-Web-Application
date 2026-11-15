import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/** Animate the page content while leaving the shell and session mounted. */
export function ModuleTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return <div className="module-transition" key={pathname}>{children}</div>;
}
