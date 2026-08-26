import { useParams } from 'react-router-dom';

export function RoomDetailPage() {
  const { roomId } = useParams();

  return (
    <main>
      <h1>Переговорная</h1>
      <p>Расписание переговорной (id: {roomId}) появится здесь</p>
    </main>
  );
}
