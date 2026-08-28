import { Check, PenLine, Tv, Users, Video, type LucideIcon } from 'lucide-react';

// Незнакомый код заменяем нейтральной галочкой
const FEATURE_ICONS: Record<string, LucideIcon> = {
  display: Tv,
  whiteboard: PenLine,
  video: Video,
};

export function FeatureIcon({ code }: { code: string }) {
  const Icon = FEATURE_ICONS[code] ?? Check;
  return <Icon className="size-18 shrink-0 text-teal-700" strokeWidth={2.5} />;
}

export function CapacityIcon() {
  return <Users className="size-18 shrink-0 text-teal-700" strokeWidth={2.5} />;
}
