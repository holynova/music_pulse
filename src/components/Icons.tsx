import type { SVGProps } from 'react';

export type IconName =
  | 'arrow-up'
  | 'chevron-down'
  | 'file-audio'
  | 'loader'
  | 'pause'
  | 'play'
  | 'refresh'
  | 'settings'
  | 'spark'
  | 'upload'
  | 'waveform';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common} {...props}>
      {name === 'arrow-up' && <path d="M12 19V5m-5 5 5-5 5 5" />}
      {name === 'chevron-down' && <path d="m6 9 6 6 6-6" />}
      {name === 'file-audio' && (
        <>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
          <path d="M14 3v6h6M8 15v-3m0 3a2 2 0 1 0 2 2m-2-2 6-2m0 0v3m0-3a2 2 0 1 0 2 2" />
        </>
      )}
      {name === 'loader' && <path d="M12 3a9 9 0 1 1-9 9" />}
      {name === 'pause' && <path d="M9 5v14M15 5v14" />}
      {name === 'play' && <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />}
      {name === 'refresh' && <path d="M20 11a8 8 0 1 0 1 4m-1-9v5h-5" />}
      {name === 'settings' && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      )}
      {name === 'spark' && <path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3ZM19 16l.5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5Z" />}
      {name === 'upload' && <path d="M12 16V4m-4 4 4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />}
      {name === 'waveform' && <path d="M4 12h2l1.5-5 3 10L12 8l2 8 2-4h4" />}
    </svg>
  );
}
