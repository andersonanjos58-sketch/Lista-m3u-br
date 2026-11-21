import React, { useRef, useState } from 'react';
import { FileUp, RotateCcw, Wand2 } from 'lucide-react';
import { Channel, parseM3U } from '../utils/m3uParser';

interface ImportViewProps {
  onImportChannels: (channels: Channel[], repairedLineBreaks: boolean, mode: 'replace' | 'append') => void;
  onResetDefault: () => void;
  onNotify: (message: string) => void;
}

export function ImportView({
  onImportChannels,
  onResetDefault,
  onNotify,
}: ImportViewProps) {
  const [rawText, setRawText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleProcess = () => {
    if (!rawText.trim()) {
      setFeedback('Cole uma lista M3U antes de processar.');
      return;
    }

    const result = parseM3U(rawText);
    if (result.channels.length === 0) {
      setFeedback('Nenhum canal válido encontrado. Verifique se o conteúdo possui linhas #EXTINF e URLs http/https.');
      return;
    }

    onImportChannels(result.channels, result.repairedLineBreaks, importMode);
    setRawText('');
    setFeedback(null);
    onNotify(
      `${result.channels.length} canais ${importMode === 'replace' ? 'carregados' : 'adicionados'}${
        result.repairedLineBreaks ? ' com correção automática de quebras de linha' : ''
      }.`
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setRawText(content);
      setFeedback(`Arquivo "${file.name}" carregado no editor. Clique em Processar para importar.`);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Importar ou Corrigir M3U
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Cole uma lista M3U (mesmo colada em uma única linha sem quebras) ou carregue um arquivo <span className="font-mono">.m3u</span> / <span className="font-mono">.m3u8</span> do seu computador.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDefault}
          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          Restaurar lista padrão (57 canais)
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setImportMode('replace')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                importMode === 'replace'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Substituir lista atual
            </button>
            <button
              type="button"
              onClick={() => setImportMode('append')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                importMode === 'append'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mesclar com lista atual
            </button>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".m3u,.m3u8,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-500" />
              Carregar arquivo .m3u
            </button>
          </div>
        </div>

        <textarea
          rows={12}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            if (feedback) setFeedback(null);
          }}
          placeholder={'#EXTM3U\n#EXTINF:-1 tvg-id="espn.br" group-title="Esportes",ESPN 01\nhttps://exemplo.com/stream.m3u8'}
          className="w-full p-3.5 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        />

        {feedback && (
          <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
            {feedback}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5">
          {rawText && (
            <button
              type="button"
              onClick={() => {
                setRawText('');
                setFeedback(null);
              }}
              className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={handleProcess}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Wand2 className="w-4 h-4" />
            Formatar e importar canais
          </button>
        </div>
      </div>
    </div>
  );
}
