import { useState } from 'react';

interface ChannelLogoProps {
  src: string;
  name: string;
  size?: 'sm' | 'md';
}

export function ChannelLogo({ src, name, size = 'sm' }: ChannelLogoProps) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'TV';

  const dims = size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-10 h-10 text-xs';

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={`${dims} shrink-0 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-semibold text-slate-600 select-none`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`${dims} shrink-0 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center p-1 overflow-hidden`}
    >
      <img
        src={src}
        alt={`Logotipo ${name}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
