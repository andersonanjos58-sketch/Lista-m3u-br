import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Channel, detectServerLabel } from '../utils/m3uParser';

interface ChannelModalProps {
  open: boolean;
  channel: Channel | null;
  existingGroups: string[];
  onClose: () => void;
  onSave: (channel: Channel) => void;
}

export function ChannelModal({
  open,
  channel,
  existingGroups,
  onClose,
  onSave,
}: ChannelModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [tvgId, setTvgId] = useState('');
  const [groupTitle, setGroupTitle] = useState('Esportes');
  const [tvgLogo, setTvgLogo] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (channel) {
      setDisplayName(channel.displayName);
      setTvgId(channel.tvgId);
      setGroupTitle(channel.groupTitle);
      setTvgLogo(channel.tvgLogo);
      setUrl(channel.url);
    } else {
      setDisplayName('');
      setTvgId('');
      setGroupTitle(existingGroups[0] || 'Esportes');
      setTvgLogo('');
      setUrl('');
    }
    setError('');
  }, [open, channel, existingGroups]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    const cleanUrl = url.trim();
    if (!cleanName) {
      setError('Informe o nome do canal.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(cleanUrl)) {
      setError('Informe uma URL de stream válida iniciando com http:// ou https://.');
      return;
    }

    const updated: Channel = {
      id: channel?.id ?? `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      displayName: cleanName,
      tvgName: cleanName,
      tvgId: tvgId.trim(),
      tvgLogo: tvgLogo.trim(),
      groupTitle: groupTitle.trim() || 'Geral',
      url: cleanUrl,
      serverLabel: detectServerLabel(cleanName, cleanUrl),
      enabled: channel ? channel.enabled : true,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="channel-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 id="channel-modal-title" className="text-base font-semibold text-slate-900">
            {channel ? 'Editar canal' : 'Adicionar novo canal'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs font-medium text-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="ch-name" className="block text-xs font-medium text-slate-700 mb-1.5">
              Nome do canal
            </label>
            <input
              id="ch-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: ESPN 01 — Opção 4 (Speed 3)"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ch-group" className="block text-xs font-medium text-slate-700 mb-1.5">
                Categoria (group-title)
              </label>
              <input
                id="ch-group"
                type="text"
                list="group-suggestions"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Ex: Esportes"
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              <datalist id="group-suggestions">
                {existingGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="ch-tvgid" className="block text-xs font-medium text-slate-700 mb-1.5">
                TVG ID (Guia EPG)
              </label>
              <input
                id="ch-tvgid"
                type="text"
                value={tvgId}
                onChange={(e) => setTvgId(e.target.value)}
                placeholder="Ex: espn.br"
                className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ch-url" className="block text-xs font-medium text-slate-700 mb-1.5">
              URL do stream (.m3u8)
            </label>
            <input
              id="ch-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div>
            <label htmlFor="ch-logo" className="block text-xs font-medium text-slate-700 mb-1.5">
              URL do logotipo (tvg-logo)
            </label>
            <input
              id="ch-logo"
              type="url"
              value={tvgLogo}
              onChange={(e) => setTvgLogo(e.target.value)}
              placeholder="https://raw.githubusercontent.com/tv-logo/..."
              className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              {channel ? 'Salvar alterações' : 'Adicionar canal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
