'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const p = usePathname();
  const is = (x) => (p === x || (x !== '/' && p.startsWith(x)) ? 'active' : '');
  return (
    <div className="topbar no-print">
      <div className="brand"><b>Paris&amp;Ko</b></div>
      <nav>
        <Link className={is('/')} href="/">Itinéraires</Link>
        <Link className={is('/clients')} href="/clients">Clients</Link>
        <Link className={is('/library')} href="/library">Bibliothèque</Link>
        <Link className={is('/templates')} href="/templates">Modèles</Link>
        <Link className={is('/media')} href="/media">Médiathèque</Link>
      </nav>
      <div className="spacer" />
    </div>
  );
}
