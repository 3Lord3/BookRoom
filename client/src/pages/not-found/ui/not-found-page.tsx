import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main>
      <h1>404</h1>
      <p>Ничего не найдено</p>
      <Link to="/rooms">Вернуться к переговорным</Link>
    </main>
  );
}
