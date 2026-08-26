import { Navigate, createBrowserRouter } from 'react-router-dom';

import { MyBookingsPage } from '@pages/my-bookings';
import { NotFoundPage } from '@pages/not-found';
import { RoomDetailPage } from '@pages/room-detail';
import { RoomsPage } from '@pages/rooms';

import { AppShell } from '../ui/app-shell';

export function createAppRouter() {
  return createBrowserRouter([
    {
      element: <AppShell />,
      children: [
        { path: '/', element: <Navigate to="/rooms" replace /> },
        { path: '/rooms', element: <RoomsPage /> },
        { path: '/rooms/:roomId', element: <RoomDetailPage /> },
        { path: '/bookings', element: <MyBookingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);
}
