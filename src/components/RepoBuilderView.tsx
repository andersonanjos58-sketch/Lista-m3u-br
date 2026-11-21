import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileJson,
  FileText,
  FolderArchive,
  Terminal,
  UploadCloud,
} from 'lucide-react';
import { Channel, ValidationReport } from '../utils/m3uParser';
import {
  RepoConfig,
  buildRepoFiles,
  downloadRepoZip,
  downloadTextFile,
  formatBytes,
  generateGhCliCommand,
  generateGitCommands,
  getGithubNewRepoLink,
  getRawGithubUrl,
  sanitizeFileName,
  sanitizeSlug,
} from '../utils/repoGenerator';
import { QrCodeCard } from './QrCodeCard';

interface RepoBuilderViewProps {
  config: RepoConfig;
  channels: Channel[];
  report: ValidationReport;
  repairedLineBreaks: boolean;
  onChangeConfig: (next: RepoConfig) => void;
  onNotify: (message: string) => void;
  onNavigate: (tab: 'repo' | 'channels' | 'm3u' | 'readme' | 'import') => void;
}

type PublishMethod = 'web' | 'git' | 'gh';

export function RepoBuilderView({
  config,
  channels,
  report,
  repairedLineBreaks,
  onChangeConfig,
  onNotify,
  onNavigate,
}: RepoBuilderViewProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [publishMethod, setPublishMethod] = useState<PublishMethod>('web');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const files = useMemo(() => buildRepoFiles(config, channels), [config, channels]);
  const safeSelectedIndex = selectedFileIndex < files.length ? selectedFileIndex : 0;
  const activeFile = files[safeSelectedIndex];

  const rawUrl = useMemo(() => getRawGithubUrl(config), [config]);
  const newRepoLink = useMemo(() => getGithubNewRepoLink(config), [config]);
  const gitCommands = useMemo(() => generateGitCommands(config), [config]);
  const ghCommands = useMemo(() => generateGhCliCommand(config), [config]);

  const repoSlug = sanitizeSlug(config.repoName, 'lista-iptv-brasil');
  const m3uFileName = sanitizeFileName(config.fileName);

  const copyText = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onNotify(`${label} copiado para a área de transferência.`);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      onNotify('Não foi possível copiar automaticamente. Selecione o texto manualmente.');
    }
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadRepoZip(config, channels);
      onNotify(`Pacote ${repoSlug}.zip baixado com ${files.length} arquivos.`);
    } finally {
      setIsZipping(false);
    }
  };

  const renderFileIcon = (name: string) => {
    if (name.endsWith('.m3u') || name.endsWith('.m3u8')) {
      return <FileCode2 className="w-4 h-4 text-blue-700 shrink-0" />;
    }
    if (name.endsWith('.json')) {
      return <FileJson className="w-4 h-4 text-slate-600 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  return (
    <div className="space-y-8">
      {/* Header & Summary Strip */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Repositório GitHub pronto para publicar
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Sua lista M3U foi normalizada automaticamente{repairedLineBreaks ? ' (quebras de linha restauradas)' : ''}{' '}
            e empacotada com <span className="font-mono text-slate-800">{m3uFileName}</span>,{' '}
            <span className="font-mono text-slate-800">README.md</span> e estrutura completa para hospedar no GitHub.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 tabular-nums shrink-0">
          <div>
            <span className="block text-xs text-slate-500">Canais ativos</span>
            <button
              type="button"
              onClick={() => onNavigate('channels')}
              className="font-mono text-lg font-semibold text-slate-900 hover:text-blue-700 transition-colors cursor-pointer"
            >
              {report.activeChannels}
            </button>
          </div>
          <div className="w-px h-8 bg-slate-200" aria-hidden="true" />
          <div>
            <span className="block text-xs text-slate-500">Categorias</span>
            <span className="font-mono text-lg font-semibold text-slate-900">
              {report.categoriesCount}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200" aria-hidden="true" />
          <div>
            <span className="block text-xs text-slate-500">Linhas M3U</span>
            <span className="font-mono text-lg font-semibold text-slate-900">
              {report.lineCount}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200" aria-hidden="true" />
          <div>
            <span className="block text-xs text-slate-500">Validação</span>
            <span className="text-sm font-semibold text-emerald-700">
              {report.invalidUrls === 0 ? 'Válido' : `${report.invalidUrls} alerta(s)`}
            </span>
          </div>
        </div>
      </section>

      {/* Section 1: Repository Config + Generated Raw URL & QR */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Config form */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              01. Configuração do Repositório
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalize os dados abaixo para gerar a URL Raw e os comandos exatos da sua conta.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="gh-user" className="block text-xs font-medium text-slate-700 mb-1">
                Usuário GitHub
              </label>
              <input
                id="gh-user"
                type="text"
                value={config.username}
                onChange={(e) => onChangeConfig({ ...config, username: e.target.value })}
                placeholder="seu-usuario"
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label htmlFor="gh-repo" className="block text-xs font-medium text-slate-700 mb-1">
                Nome do repositório
              </label>
              <input
                id="gh-repo"
                type="text"
                value={config.repoName}
                onChange={(e) => onChangeConfig({ ...config, repoName: e.target.value })}
                placeholder="lista-iptv-brasil"
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label htmlFor="gh-file" className="block text-xs font-medium text-slate-700 mb-1">
                Arquivo da playlist
              </label>
              <input
                id="gh-file"
                type="text"
                value={config.fileName}
                onChange={(e) => onChangeConfig({ ...config, fileName: e.target.value })}
                placeholder="lista.m3u"
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label htmlFor="gh-branch" className="block text-xs font-medium text-slate-700 mb-1">
                Branch principal
              </label>
              <input
                id="gh-branch"
                type="text"
                value={config.branch}
                onChange={(e) => onChangeConfig({ ...config, branch: e.target.value })}
                placeholder="main"
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gh-desc" className="block text-xs font-medium text-slate-700 mb-1">
              Descrição do repositório
            </label>
            <textarea
              id="gh-desc"
              rows={2}
              value={config.description}
              onChange={(e) => onChangeConfig({ ...config, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, visibility: 'public' })}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  config.visibility === 'public'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Público (recomendado)
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, visibility: 'private' })}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  config.visibility === 'private'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Privado
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-700">
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.includeJson}
                  onChange={(e) => onChangeConfig({ ...config, includeJson: e.target.checked })}
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                canais.json
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.includeLicense}
                  onChange={(e) => onChangeConfig({ ...config, includeLicense: e.target.checked })}
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                LICENSE
              </label>
            </div>
          </div>
        </div>

        {/* Right: Generated Raw URL + Quick Actions + QR Code */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col lg:flex-row gap-6 justify-between">
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  02. Link Raw para Players IPTV
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assim que o repositório for publicado como público, esta será a URL direta da sua lista M3U.
                </p>
              </div>

              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs text-slate-800 break-all select-all">
                  {rawUrl}
                </div>
                <button
                  type="button"
                  onClick={() => copyText('raw-url', rawUrl, 'Link Raw')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedKey === 'raw-url' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  {copiedKey === 'raw-url' ? 'Copiado' : 'Copiar link'}
                </button>
              </div>

              {config.visibility === 'private' && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Atenção: repositórios privados exigem token de acesso na URL Raw. Para usar diretamente em Smart TVs e players IPTV, mantenha o repositório como Público.
                </p>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isZipping || report.activeChannels === 0}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FolderArchive className="w-4 h-4" />
                  {isZipping ? 'Gerando ZIP...' : `Baixar ${repoSlug}.zip`}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const m3uFile = files[0];
                    if (m3uFile) {
                      downloadTextFile(m3uFile.name, m3uFile.content, 'audio/x-mpegurl;charset=utf-8');
                      onNotify(`Arquivo ${m3uFile.name} baixado.`);
                    }
                  }}
                  disabled={report.activeChannels === 0}
                  className="px-4 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  Baixar só {m3uFileName}
                </button>

                <a
                  href={newRepoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  Criar no GitHub
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <QrCodeCard url={rawUrl} repoName={repoSlug} />
          </div>
        </div>
      </section>

      {/* Section 2: Interactive GitHub Publishing Guide */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              03. Como subir no GitHub em 1 minuto
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha o método mais prático para criar o repositório na sua conta GitHub.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPublishMethod('web')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                publishMethod === 'web'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Pelo navegador
            </button>
            <button
              type="button"
              onClick={() => setPublishMethod('git')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                publishMethod === 'git'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal Git
            </button>
            <button
              type="button"
              onClick={() => setPublishMethod('gh')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                publishMethod === 'gh'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              GitHub CLI (gh)
            </button>
          </div>
        </div>

        <div className="p-5">
          {publishMethod === 'web' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">Passo 1</div>
                <h3 className="text-sm font-semibold text-slate-900">Baixe os arquivos prontos</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Clique em <strong>Baixar {repoSlug}.zip</strong> acima e extraia a pasta no seu computador. Ela já contém <span className="font-mono">{m3uFileName}</span> corrigido e o <span className="font-mono">README.md</span>.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">Passo 2</div>
                <h3 className="text-sm font-semibold text-slate-900">Crie o repositório vazio</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Abra{' '}
                  <a
                    href={newRepoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-800 font-medium"
                  >
                    github.com/new
                  </a>{' '}
                  (já preenchido com o nome <span className="font-mono">{repoSlug}</span>) e clique em <strong>Create repository</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">Passo 3</div>
                <h3 className="text-sm font-semibold text-slate-900">Envie e use o link Raw</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Na tela do repositório novo, clique em <strong>uploading an existing file</strong>, arraste os arquivos da pasta extraída e confirme em <strong>Commit changes</strong>.
                </p>
              </div>
            </div>
          )}

          {publishMethod === 'git' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  Extraia o <span className="font-mono">{repoSlug}.zip</span> e execute os comandos abaixo no terminal após criar o repositório vazio no GitHub:
                </p>
                <button
                  type="button"
                  onClick={() => copyText('git-cmd', gitCommands, 'Comandos Git')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedKey === 'git-cmd' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  {copiedKey === 'git-cmd' ? 'Copiado' : 'Copiar comandos'}
                </button>
              </div>
              <pre className="bg-[#0D1117] text-[#E6EDF3] text-xs font-mono p-4 rounded-md overflow-x-auto leading-relaxed code-scroll">
                <code>{gitCommands}</code>
              </pre>
            </div>
          )}

          {publishMethod === 'gh' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  Cria o repositório remoto automaticamente na sua conta GitHub e faz o push em um único passo usando <span className="font-mono">gh</span>:
                </p>
                <button
                  type="button"
                  onClick={() => copyText('gh-cmd', ghCommands, 'Comando GitHub CLI')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedKey === 'gh-cmd' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  {copiedKey === 'gh-cmd' ? 'Copiado' : 'Copiar comando'}
                </button>
              </div>
              <pre className="bg-[#0D1117] text-[#E6EDF3] text-xs font-mono p-4 rounded-md overflow-x-auto leading-relaxed code-scroll">
                <code>{ghCommands}</code>
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Interactive Repository File Explorer */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
            <span className="font-semibold text-slate-900">
              {sanitizeSlug(config.username, 'seu-usuario')}/{repoSlug}
            </span>
            <span aria-hidden="true">/</span>
            <span>{sanitizeSlug(config.branch, 'main')}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{files.length} arquivos</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyText('active-file', activeFile.content, activeFile.name)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copiedKey === 'active-file' ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              Copiar {activeFile.name}
            </button>
            <button
              type="button"
              onClick={() => {
                downloadTextFile(activeFile.name, activeFile.content);
                onNotify(`Arquivo ${activeFile.name} baixado.`);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Baixar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* File tree sidebar */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 divide-y divide-slate-100">
            {files.map((file, idx) => {
              const isSelected = idx === safeSelectedIndex;
              return (
                <button
                  key={file.name}
                  type="button"
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 text-blue-900'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderFileIcon(file.name)}
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-medium truncate">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {file.description}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                    {formatBytes(file.bytes)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Code preview pane */}
          <div className="lg:col-span-8 bg-[#0D1117] text-[#E6EDF3]">
            <div className="px-4 py-2 border-b border-[#21262D] flex items-center justify-between text-[11px] font-mono text-[#8B949E]">
              <span>{activeFile.name}</span>
              <span className="tabular-nums">
                {activeFile.content.split('\n').length} linhas · {formatBytes(activeFile.bytes)}
              </span>
            </div>
            <pre className="p-4 text-xs font-mono leading-relaxed overflow-auto max-h-[380px] code-scroll">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
