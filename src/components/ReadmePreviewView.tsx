import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { Channel } from '../utils/m3uParser';
import {
  RepoConfig,
  downloadTextFile,
  generateReadme,
  getRawGithubUrl,
  sanitizeFileName,
  sanitizeSlug,
} from '../utils/repoGenerator';

interface ReadmePreviewViewProps {
  config: RepoConfig;
  channels: Channel[];
  onNotify: (message: string) => void;
}

export function ReadmePreviewView({ config, channels, onNotify }: ReadmePreviewViewProps) {
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);

  const readmeContent = useMemo(() => generateReadme(config, channels), [config, channels]);
  const rawUrl = useMemo(() => getRawGithubUrl(config), [config]);
  const activeChannels = useMemo(() => channels.filter((c) => c.enabled), [channels]);

  const grouped = useMemo(() => {
    const map = new Map<string, Channel[]>();
    for (const ch of activeChannels) {
      const list = map.get(ch.groupTitle) ?? [];
      list.push(ch);
      map.set(ch.groupTitle, list);
    }
    return Array.from(map.entries());
  }, [activeChannels]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(readmeContent);
      setCopied(true);
      onNotify('README.md copiado para a área de transferência.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify('Não foi possível copiar o README.md.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Documentação <span className="font-mono">README.md</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Gerado automaticamente com a URL Raw, instruções de uso e tabela atualizada dos canais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'preview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visualização
            </button>
            <button
              type="button"
              onClick={() => setMode('source')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'source'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Markdown
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-700" />
            ) : (
              <Copy className="w-4 h-4 text-slate-600" />
            )}
            {copied ? 'Copiado' : 'Copiar'}
          </button>

          <button
            type="button"
            onClick={() => {
              downloadTextFile('README.md', readmeContent, 'text/markdown;charset=utf-8');
              onNotify('Arquivo README.md baixado.');
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Baixar README.md
          </button>
        </div>
      </div>

      {mode === 'source' ? (
        <div className="bg-[#0D1117] border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#21262D] text-xs font-mono text-[#8B949E]">
            README.md
          </div>
          <pre className="p-5 text-xs font-mono text-[#E6EDF3] leading-relaxed overflow-auto max-h-[640px] code-scroll">
            <code>{readmeContent}</code>
          </pre>
        </div>
      ) : (
        <article className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6 max-w-4xl">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 font-mono">
              {sanitizeSlug(config.repoName, 'lista-iptv-brasil')}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {config.description}
            </p>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-base font-semibold text-slate-900">
              Link Direto da Lista (URL Raw)
            </h3>
            <p className="text-sm text-slate-600">
              Copie a URL abaixo e cole diretamente no seu player IPTV favorito (VLC, TiviMate, IPTV Smarters, Kodi, OttPlayer ou SS IPTV):
            </p>
            <pre className="bg-slate-50 border border-slate-200 rounded-md p-3.5 text-xs font-mono text-slate-800 overflow-x-auto">
              <code>{rawUrl}</code>
            </pre>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              Resumo dos Canais
            </h3>
            <p className="text-sm text-slate-600 tabular-nums">
              Total de <strong>{activeChannels.length} canais ativos</strong> distribuídos em{' '}
              <strong>{grouped.length} categorias</strong> no arquivo{' '}
              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{sanitizeFileName(config.fileName)}</code>:
            </p>
            <div className="overflow-x-auto border border-slate-200 rounded-md max-w-md">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <th className="py-2 px-3 text-left">Categoria</th>
                    <th className="py-2 px-3 text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {grouped.map(([group, list]) => (
                    <tr key={group}>
                      <td className="py-2 px-3 text-slate-800">{group}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {list.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-base font-semibold text-slate-900">
              Catálogo Completo
            </h3>
            {grouped.map(([group, list]) => (
              <div key={group} className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800 tabular-nums">
                  {group} ({list.length})
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3 text-left font-medium">Canal</th>
                        <th className="py-2 px-3 text-left font-medium">TVG ID</th>
                        <th className="py-2 px-3 text-left font-medium">Servidor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map((ch) => (
                        <tr key={ch.id}>
                          <td className="py-2 px-3 text-slate-800">{ch.displayName}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{ch.tvgId || '—'}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{ch.serverLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
