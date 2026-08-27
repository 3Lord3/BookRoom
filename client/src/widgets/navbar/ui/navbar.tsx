import { Link, NavLink } from 'react-router-dom';

import { cn } from '@shared/lib/cn';
import { Skeleton } from '@shared/ui/skeleton';

import { useNavbar } from '../model/use-navbar';

export function Navbar() {
  const { links, viewer, shortDisplayName } = useNavbar();

  return (
    <header className="flex h-72 items-center justify-between border-b border-border bg-card px-40">
      <Link to="/rooms" className="flex items-center gap-12">
        <img src="/favicon.svg" alt="Логотип BookRoom" className="size-36" />
        <span className="text-5xl font-extrabold">BookRoom</span>
      </Link>

      <nav className="flex items-center gap-32 self-stretch">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center border-b-2 text-2xl',
                isActive
                  ? 'border-teal-700 font-semibold text-teal-700'
                  : 'border-transparent font-medium text-blue-700',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Сбой /me не должен мешать навигации, профиль просто скрываем */}
      {viewer.status === 'loading' && <Skeleton className="size-40 rounded-full" />}
      {viewer.status === 'success' && (
        <div className="flex items-center gap-12">
          <span className="text-xl font-semibold">{shortDisplayName}</span>
          <span className="flex size-40 items-center justify-center rounded-full bg-blue-500 font-inter text-xl font-semibold text-white">
            {viewer.data.initials}
          </span>
        </div>
      )}
    </header>
  );
}
