import type { ReactNode } from 'react';

import { cn } from '@shared/lib/cn';
import { Button } from '@shared/ui/button';

type Tone = 'teal' | 'gray' | 'red';

const TONE_CLASSES: Record<Tone, { circle: string; icon: string }> = {
  teal: { circle: 'bg-teal-200', icon: 'text-teal-700' },
  gray: { circle: 'bg-blue-100', icon: 'text-blue-400' },
  red: { circle: 'bg-red-100', icon: 'text-red-600' },
};

interface StateBlockProps {
  tone: Tone;
  // Крупная иконка lucide в круглой рамке из макета
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: { label: string; onClick: () => void };
}

export function StateBlock({ tone, icon, title, subtitle, action }: StateBlockProps) {
  const classes = TONE_CLASSES[tone];

  return (
    <div className="flex grow flex-col items-center justify-center gap-24 px-40 pt-80 pb-120 text-center">
      <div
        className={cn(
          'flex size-120 items-center justify-center rounded-full [&_svg]:size-48',
          classes.circle,
          classes.icon,
        )}
      >
        {icon}
      </div>
      <div className="flex max-w-[480px] flex-col items-center gap-12">
        <h2 className="text-6xl font-extrabold">{title}</h2>
        <p className="whitespace-pre-line text-2xl text-blue-700">{subtitle}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} className="h-auto rounded-8 px-24 py-12 text-xl font-bold">
          {action.label}
        </Button>
      )}
    </div>
  );
}
