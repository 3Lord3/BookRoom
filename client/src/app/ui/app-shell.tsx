import { Outlet } from 'react-router-dom';

import { ConnectionBanner } from '@widgets/connection-banner';
import { Navbar } from '@widgets/navbar';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ConnectionBanner />
      <Navbar />
      <Outlet />
    </div>
  );
}
