import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { Channel, ValidationReport, serializeM3U } from '../utils/m3uParser';
import { downloadTextFile, formatBytes } from '../utils/repoGenerator';

interface M3uCodeViewProps {
  channels: Channel[];
  fileName: string;
  report: ValidationReport;
  repairedLineBreaks: boolean;
  onNotify: (message: string) => void;
}

export function M3uCodeView({
  channels,
  fileName,
  report,
  repairedLineBreaks,
  onNotify,
}: M3uCodeViewProps) {
  const [copied, setCopied] = useState(false);

  const m3uText = useMemo(() => serializeM3U(channels, true), [channels]);
  const lines = useMemo(() => m3uText.trimEnd().split('\n'), [m3uText]);
  const byteSize = useMemo(() => new TextEncoder().encode(m3uText).length, [m3uText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(m3uText);
      setCopied(true);
      onNotify(`Conteúdo de ${fileName} copiado (${lines.length} linhas).`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify('Não foi possível copiar o texto automaticamente.');
    }
  };

  const handleDownload = () => {
    downloadTextFile(fileName, m3uText, 'audio/x-mpegurl;charset=utf-8');
    onNotify(`Arquivo ${fileName} baixado.`);
  };

  const getLineColor = (line: string) => {
    if (line.startsWith('#EXTM3U')) return 'text-[#79C0FF] font-semibold';
    if (line.startsWith('#EXTINF:')) return 'text-[#A5D6FF]';
    if (line.startsWith('http://') || line.startsWith('https://')) return 'text-[#7EE787]';
    return 'text-[#E6EDF3]';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Arquivo <span className="font-mono">{fileName}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {repairedLineBreaks
              ? 'Quebras de linha ausentes na lista original foram corrigidas automaticamente para o padrão #EXTM3U.'
              : 'Playlist formatada em UTF-8 pronta para commit no repositório GitHub.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
            {copied ? 'Copiado' : 'Copiar M3U'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Baixar {fileName}
          </button>
        </div>
      </div>

      {/* Validation summary strip (unboxed typographic metadata) */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 tabular-nums">
        <span>
          Cabeçalho: <strong className="font-mono text-emerald-700">#EXTM3U</strong>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Canais ativos: <strong className="font-mono text-slate-900">{report.activeChannels}</strong>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Linhas: <strong className="font-mono text-slate-900">{lines.length}</strong>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Tamanho: <strong className="font-mono text-slate-900">{formatBytes(byteSize)}</strong>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          URLs duplicadas:{' '}
          <strong className={`font-mono ${report.duplicateUrls > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {report.duplicateUrls}
          </strong>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          URLs inválidas:{' '}
          <strong className={`font-mono ${report.invalidUrls > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {report.invalidUrls}
          </strong>
        </span>
      </div>

      {/* Code block */}
      <div className="bg-[#0D1117] border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#21262D] flex items-center justify-between text-xs font-mono text-[#8B949E]">
          <span>{fileName}</span>
          <span>UTF-8 · LF</span>
        </div>
        <div className="overflow-auto max-h-[640px] code-scroll">
          <table className="w-full border-collapse font-mono text-xs leading-6">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-[#161B22]">
                  <td className="select-none text-right pr-4 pl-4 text-[#6E7681] tabular-nums w-12 align-top">
                    {i + 1}
                  </td>
                  <td className={`pr-4 whitespace-pre ${getLineColor(line)}`}>
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
