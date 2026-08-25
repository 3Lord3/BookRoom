import { Outlet } from 'react-router-dom';

import { Navbar } from '@widgets/navbar';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <Outlet />
    </div>
  );
}
