import { TriangleAlert } from 'lucide-react';

import { useConnectionBanner } from '../model/use-connection-banner';

// Жёлтая плашка над шапкой, пока идёт переподключение
export function ConnectionBanner() {
  const { visible } = useConnectionBanner();

  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-12 border-b border-yellow-400 bg-yellow-300 px-32 py-10"
    >
      <TriangleAlert className="size-18 shrink-0 text-orange-800" strokeWidth={2} />
      <span className="text-xl font-semibold text-orange-800">
        Соединение потеряно. Переподключение...
      </span>
    </div>
  );
}
