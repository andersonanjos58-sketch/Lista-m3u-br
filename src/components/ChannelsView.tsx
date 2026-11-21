import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Channel } from '../utils/m3uParser';
import { ChannelLogo } from './ChannelLogo';

interface ChannelsViewProps {
  channels: Channel[];
  onToggleChannel: (id: string) => void;
  onToggleAllFiltered: (ids: string[], enabled: boolean) => void;
  onAddChannel: () => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (id: string) => void;
  onNotify: (message: string) => void;
}

export function ChannelsView({
  channels,
  onToggleChannel,
  onToggleAllFiltered,
  onAddChannel,
  onEditChannel,
  onDeleteChannel,
  onNotify,
}: ChannelsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('Todos');
  const [selectedSpeed, setSelectedSpeed] = useState<string>('Todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ch of channels) {
      counts.set(ch.groupTitle, (counts.get(ch.groupTitle) ?? 0) + 1);
    }
    return [
      { name: 'Todos', count: channels.length },
      ...Array.from(counts.entries()).map(([name, count]) => ({ name, count })),
    ];
  }, [channels]);

  const speeds = useMemo(() => {
    const unique = Array.from(new Set(channels.map((c) => c.serverLabel))).sort();
    return ['Todos', ...unique];
  }, [channels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((ch) => {
      if (selectedGroup !== 'Todos' && ch.groupTitle !== selectedGroup) return false;
      if (selectedSpeed !== 'Todos' && ch.serverLabel !== selectedSpeed) return false;
      if (!q) return true;
      return (
        ch.displayName.toLowerCase().includes(q) ||
        ch.tvgId.toLowerCase().includes(q) ||
        ch.groupTitle.toLowerCase().includes(q) ||
        ch.url.toLowerCase().includes(q)
      );
    });
  }, [channels, search, selectedGroup, selectedSpeed]);

  const allFilteredEnabled = filtered.length > 0 && filtered.every((c) => c.enabled);
  const activeCount = channels.filter((c) => c.enabled).length;

  const handleCopyUrl = async (ch: Channel) => {
    try {
      await navigator.clipboard.writeText(ch.url);
      setCopiedId(ch.id);
      onNotify(`URL de "${ch.displayName}" copiada.`);
      setTimeout(() => {
        setCopiedId((prev) => (prev === ch.id ? null : prev));
      }, 1800);
    } catch {
      onNotify('Não foi possível copiar o link.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Catálogo de Canais
          </h1>
          <p className="mt-1 text-sm text-slate-600 tabular-nums">
            {activeCount} de {channels.length} canais marcados para inclusão no arquivo M3U do repositório.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddChannel}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Adicionar canal
        </button>
      </div>

      {/* Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, TVG ID ou URL do stream..."
              className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="speed-filter" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Servidor:
            </label>
            <select
              id="speed-filter"
              value={selectedSpeed}
              onChange={(e) => setSelectedSpeed(e.target.value)}
              className="h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            >
              {speeds.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category segmented buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {groups.map((grp) => {
            const active = selectedGroup === grp.name;
            return (
              <button
                key={grp.name}
                type="button"
                onClick={() => setSelectedGroup(grp.name)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {grp.name} ({grp.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-800">
              Nenhum canal encontrado para o filtro atual.
            </p>
            <p className="text-xs text-slate-500">
              Limpe a busca ou adicione um novo canal manualmente à lista M3U.
            </p>
            <div className="pt-1 flex items-center justify-center gap-2.5">
              {(search || selectedGroup !== 'Todos' || selectedSpeed !== 'Todos') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedGroup('Todos');
                    setSelectedSpeed('Todos');
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
              <button
                type="button"
                onClick={onAddChannel}
                className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer"
              >
                Adicionar canal
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                  <th className="py-2.5 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos os canais filtrados"
                      checked={allFilteredEnabled}
                      onChange={(e) =>
                        onToggleAllFiltered(
                          filtered.map((c) => c.id),
                          e.target.checked
                        )
                      }
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Canal</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Categoria</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">TVG ID</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Servidor</th>
                  <th className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((ch) => (
                  <tr
                    key={ch.id}
                    className={`transition-colors ${
                      ch.enabled ? 'hover:bg-slate-50/90' : 'bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-2 align-middle">
                      <input
                        type="checkbox"
                        aria-label={`Incluir ${ch.displayName}`}
                        checked={ch.enabled}
                        onChange={() => onToggleChannel(ch.id)}
                        className="rounded border-slate-300 text-blue-700 focus:ring-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 align-middle min-w-[240px]">
                      <div className="flex items-center gap-3">
                        <ChannelLogo src={ch.tvgLogo} name={ch.displayName} />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate max-w-[320px]">
                            {ch.displayName}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 truncate max-w-[320px]">
                            {ch.url}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-middle text-xs text-slate-700 whitespace-nowrap">
                      {ch.groupTitle}
                    </td>
                    <td className="py-2.5 px-3 align-middle font-mono text-xs text-slate-600 whitespace-nowrap">
                      {ch.tvgId || '—'}
                    </td>
                    <td className="py-2.5 px-3 align-middle font-mono text-xs text-slate-700 whitespace-nowrap">
                      {ch.serverLabel}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(ch)}
                          title="Copiar URL do stream"
                          aria-label={`Copiar URL de ${ch.displayName}`}
                          className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {copiedId === ch.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditChannel(ch)}
                          title="Editar canal"
                          aria-label={`Editar ${ch.displayName}`}
                          className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteChannel(ch.id)}
                          title="Remover canal"
                          aria-label={`Remover ${ch.displayName}`}
                          className="p-2 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
