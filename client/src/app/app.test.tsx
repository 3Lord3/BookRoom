import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './app';

describe('App', () => {
  it('рендерит бренд и навигацию', () => {
    window.history.replaceState({}, '', '/rooms');
    render(<App />);

    expect(screen.getByText('BookRoom')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Переговорные' })).toHaveAttribute('href', '/rooms');
    expect(screen.getByRole('link', { name: 'Мои бронирования' })).toHaveAttribute(
      'href',
      '/bookings',
    );
  });

  it('подгружает профиль из /me', async () => {
    window.history.replaceState({}, '', '/rooms');
    render(<App />);

    expect(await screen.findByText('Константин К.')).toBeInTheDocument();
  });

  it('редиректит с / на /rooms', () => {
    window.history.replaceState({}, '', '/');
    render(<App />);

    // Пока офис не выбран, список переговорных не запрашивается
    expect(screen.getByRole('heading', { name: 'Выберите офис' })).toBeInTheDocument();
  });

  it('показывает страницу 404 для неизвестного маршрута', () => {
    window.history.replaceState({}, '', '/unknown-path');
    render(<App />);

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });
});
