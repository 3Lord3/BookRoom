import { Link, NavLink } from 'react-router-dom';

import { cn } from '@shared/lib/cn';
import { Skeleton } from '@shared/ui/skeleton';

import { useNavbar } from '../model/use-navbar';

export function Navbar() {
  const { links, viewer } = useNavbar();

  return (
    <header className="flex items-center justify-between border-b p-4">
      <Link to="/rooms">BookRoom</Link>
      <nav className="flex items-center gap-6">
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(isActive && 'font-semibold')}>
            {label}
          </NavLink>
        ))}
      </nav>
      {viewer.status === 'loading' && <Skeleton className="size-10 rounded-full" />}
      {/* Авторизация замокана: сбой /me не должен мешать навигации, просто скрываем профиль */}
      {viewer.status === 'success' && <span>{viewer.data.displayName}</span>}
    </header>
  );
}
