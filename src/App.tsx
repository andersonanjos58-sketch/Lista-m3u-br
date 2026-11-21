import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  FileCode2,
  FileText,
  FolderArchive,
  GitBranch,
  ListVideo,
  Menu,
  Upload,
  X,
} from 'lucide-react';
import { USER_RAW_M3U } from './data/defaultM3U';
import { Channel, parseM3U, serializeM3U, validateChannels } from './utils/m3uParser';
import {
  DEFAULT_REPO_CONFIG,
  RepoConfig,
  downloadRepoZip,
  sanitizeFileName,
  sanitizeSlug,
} from './utils/repoGenerator';
import { RepoBuilderView } from './components/RepoBuilderView';
import { ChannelsView } from './components/ChannelsView';
import { M3uCodeView } from './components/M3uCodeView';
import { ReadmePreviewView } from './components/ReadmePreviewView';
import { ImportView } from './components/ImportView';
import { ChannelModal } from './components/ChannelModal';

type TabKey = 'repo' | 'channels' | 'm3u' | 'readme' | 'import';

const STORAGE_CONFIG_KEY = 'm3u_repo_studio_config_v1';

export default function App() {
  const initialParse = useMemo(() => parseM3U(USER_RAW_M3U), []);
  const [channels, setChannels] = useState<Channel[]>(initialParse.channels);
  const [repairedLineBreaks, setRepairedLineBreaks] = useState<boolean>(
    initialParse.repairedLineBreaks
  );

  const [config, setConfig] = useState<RepoConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) {
        return { ...DEFAULT_REPO_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_REPO_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<TabKey>('repo');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedTop, setCopiedTop] = useState(false);
  const [isZippingTop, setIsZippingTop] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // ignore storage errors
    }
  }, [config]);

  const report = useMemo(() => validateChannels(channels), [channels]);
  const existingGroups = useMemo(
    () => Array.from(new Set(channels.map((c) => c.groupTitle))),
    [channels]
  );

  const notify = (message: string) => {
    setToast(message);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleToggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleToggleAllFiltered = (ids: string[], enabled: boolean) => {
    const idSet = new Set(ids);
    setChannels((prev) =>
      prev.map((c) => (idSet.has(c.id) ? { ...c, enabled } : c))
    );
  };

  const handleSaveChannel = (saved: Channel) => {
    setChannels((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [saved, ...prev];
    });
    notify(
      editingChannel
        ? `Canal "${saved.displayName}" atualizado.`
        : `Canal "${saved.displayName}" adicionado à lista.`
    );
  };

  const handleDeleteChannel = (id: string) => {
    const target = channels.find((c) => c.id === id);
    setChannels((prev) => prev.filter((c) => c.id !== id));
    if (target) {
      notify(`Canal "${target.displayName}" removido.`);
    }
  };

  const handleImportChannels = (
    imported: Channel[],
    repaired: boolean,
    mode: 'replace' | 'append'
  ) => {
    setChannels((prev) => (mode === 'replace' ? imported : [...prev, ...imported]));
    setRepairedLineBreaks(repaired);
    setActiveTab('repo');
  };

  const handleResetDefault = () => {
    const fresh = parseM3U(USER_RAW_M3U);
    setChannels(fresh.channels);
    setRepairedLineBreaks(fresh.repairedLineBreaks);
    notify('Lista original restaurada com os 62 canais.');
  };

  const handleCopyM3uQuick = async () => {
    try {
      await navigator.clipboard.writeText(serializeM3U(channels, true));
      setCopiedTop(true);
      notify(`Lista M3U copiada (${report.activeChannels} canais).`);
      setTimeout(() => setCopiedTop(false), 2000);
    } catch {
      notify('Não foi possível copiar automaticamente.');
    }
  };

  const handleDownloadZipTop = async () => {
    setIsZippingTop(true);
    try {
      await downloadRepoZip(config, channels);
      notify(`Repositório ${sanitizeSlug(config.repoName, 'lista-iptv-brasil')}.zip baixado.`);
    } finally {
      setIsZippingTop(false);
    }
  };

  const navItems: {
    key: TabKey;
    label: string;
    meta?: string;
    icon: typeof GitBranch;
  }[] = [
    { key: 'repo', label: 'Repositório GitHub', icon: GitBranch },
    {
      key: 'channels',
      label: 'Canais',
      meta: `${report.activeChannels}`,
      icon: ListVideo,
    },
    {
      key: 'm3u',
      label: sanitizeFileName(config.fileName),
      meta: `${report.lineCount}L`,
      icon: FileCode2,
    },
    { key: 'readme', label: 'README.md', icon: FileText },
    { key: 'import', label: 'Importar / Corrigir', icon: Upload },
  ];

  const currentTabLabel =
    navItems.find((item) => item.key === activeTab)?.label ?? 'Repositório GitHub';

  const repoDisplayPath = `${sanitizeSlug(config.username, 'seu-usuario')} / ${sanitizeSlug(
    config.repoName,
    'lista-iptv-brasil'
  )}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="h-14 px-5 flex items-center border-b border-slate-200">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            M3U Repo Studio
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.meta && (
                  <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                    {item.meta}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1 tabular-nums">
          <div className="font-mono text-slate-700 truncate">{repoDisplayPath}</div>
          <div>
            {report.activeChannels} ativos · {report.categoriesCount} categorias
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full border-r border-slate-200 flex flex-col z-10">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="font-display text-base font-bold tracking-tight text-slate-900">
                M3U Repo Studio
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-blue-700' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.meta && (
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        {item.meta}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1-2 clean actions on right */}
        <header className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação"
              className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 min-w-0 truncate">
              <span className="font-mono text-slate-600 hidden sm:inline truncate">
                {repoDisplayPath}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {currentTabLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyM3uQuick}
              disabled={report.activeChannels === 0}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedTop ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              {copiedTop ? 'M3U copiado' : 'Copiar M3U'}
            </button>

            <button
              type="button"
              onClick={handleDownloadZipTop}
              disabled={isZippingTop || report.activeChannels === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              {isZippingTop ? 'Gerando...' : 'Baixar ZIP'}
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {activeTab === 'repo' && (
            <RepoBuilderView
              config={config}
              channels={channels}
              report={report}
              repairedLineBreaks={repairedLineBreaks}
              onChangeConfig={setConfig}
              onNotify={notify}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'channels' && (
            <ChannelsView
              channels={channels}
              onToggleChannel={handleToggleChannel}
              onToggleAllFiltered={handleToggleAllFiltered}
              onAddChannel={() => {
                setEditingChannel(null);
                setModalOpen(true);
              }}
              onEditChannel={(ch) => {
                setEditingChannel(ch);
                setModalOpen(true);
              }}
              onDeleteChannel={handleDeleteChannel}
              onNotify={notify}
            />
          )}

          {activeTab === 'm3u' && (
            <M3uCodeView
              channels={channels}
              fileName={sanitizeFileName(config.fileName)}
              report={report}
              repairedLineBreaks={repairedLineBreaks}
              onNotify={notify}
            />
          )}

          {activeTab === 'readme' && (
            <ReadmePreviewView
              config={config}
              channels={channels}
              onNotify={notify}
            />
          )}

          {activeTab === 'import' && (
            <ImportView
              onImportChannels={handleImportChannels}
              onResetDefault={handleResetDefault}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      {/* Add/Edit Channel Modal */}
      <ChannelModal
        open={modalOpen}
        channel={editingChannel}
        existingGroups={existingGroups}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveChannel}
      />

      {/* Non-intrusive toast feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-md shadow-lg border border-slate-700"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
