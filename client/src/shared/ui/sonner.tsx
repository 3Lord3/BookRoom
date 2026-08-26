'use client';

import { Check, Info, Loader2, OctagonX, TriangleAlert, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Иконка в бейдже тоста: цвет инверсии задаёт CSS по [data-icon] svg
const badgeIcon = (Icon: typeof Check) => (
  <Icon className="size-20 text-teal-900" strokeWidth={2} />
);

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      // Тост отображается карточкой сверху по центру
      position="top-center"
      offset={32}
      closeButton
      className="toaster group"
      toastOptions={{ closeButtonAriaLabel: 'Закрыть уведомление' }}
      icons={{
        success: badgeIcon(Check),
        info: badgeIcon(Info),
        warning: badgeIcon(TriangleAlert),
        error: badgeIcon(OctagonX),
        loading: <Loader2 className="size-20 animate-spin text-teal-900" strokeWidth={2} />,
        close: <X className="size-14 text-blue-400" strokeWidth={2} />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          '--width': '560px',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
