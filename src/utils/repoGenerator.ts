import JSZip from 'jszip';
import { Channel, serializeM3U } from './m3uParser';

export interface RepoConfig {
  username: string;
  repoName: string;
  branch: string;
  fileName: string;
  description: string;
  visibility: 'public' | 'private';
  includeJson: boolean;
  includeLicense: boolean;
}

export const DEFAULT_REPO_CONFIG: RepoConfig = {
  username: 'seu-usuario',
  repoName: 'lista-iptv-brasil',
  branch: 'main',
  fileName: 'lista.m3u',
  description: 'Lista IPTV M3U organizada com canais brasileiros de Esportes, TV Aberta, Filmes e Séries, Notícias e Documentários.',
  visibility: 'public',
  includeJson: true,
  includeLicense: true,
};

export function sanitizeSlug(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  return cleaned || fallback;
}

export function sanitizeFileName(value: string): string {
  const cleaned = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  if (!cleaned) return 'lista.m3u';
  return cleaned.endsWith('.m3u') || cleaned.endsWith('.m3u8') ? cleaned : `${cleaned}.m3u`;
}

export function getRawGithubUrl(config: RepoConfig): string {
  const user = sanitizeSlug(config.username, 'seu-usuario');
  const repo = sanitizeSlug(config.repoName, 'lista-iptv-brasil');
  const branch = sanitizeSlug(config.branch, 'main');
  const file = sanitizeFileName(config.fileName);
  return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${file}`;
}

export function getGithubRepoUrl(config: RepoConfig): string {
  const user = sanitizeSlug(config.username, 'seu-usuario');
  const repo = sanitizeSlug(config.repoName, 'lista-iptv-brasil');
  return `https://github.com/${user}/${repo}`;
}

export function getGithubNewRepoLink(config: RepoConfig): string {
  const repo = sanitizeSlug(config.repoName, 'lista-iptv-brasil');
  const params = new URLSearchParams({
    name: repo,
    description: config.description.trim(),
    visibility: config.visibility,
  });
  return `https://github.com/new?${params.toString()}`;
}

export function generateReadme(config: RepoConfig, channels: Channel[]): string {
  const active = channels.filter((c) => c.enabled);
  const rawUrl = getRawGithubUrl(config);
  const repoSlug = sanitizeSlug(config.repoName, 'lista-iptv-brasil');
  const fileName = sanitizeFileName(config.fileName);

  const grouped = new Map<string, Channel[]>();
  for (const ch of active) {
    const group = ch.groupTitle || 'Geral';
    const arr = grouped.get(group) ?? [];
    arr.push(ch);
    grouped.set(group, arr);
  }

  const summaryRows = Array.from(grouped.entries())
    .map(([group, list]) => `| ${group} | ${list.length} |`)
    .join('\n');

  const detailedSections = Array.from(grouped.entries())
    .map(([group, list]) => {
      const items = list
        .map((ch) => `| ${ch.displayName} | \`${ch.tvgId || '—'}\` | ${ch.serverLabel} |`)
        .join('\n');
      return `### ${group} (${list.length})\n\n| Canal | TVG ID | Servidor |\n| :--- | :--- | :--- |\n${items}`;
    })
    .join('\n\n');

  return `# ${repoSlug}

${config.description}

## Link Direto da Lista (URL Raw)

Copie a URL abaixo e cole diretamente no seu player IPTV favorito (VLC, TiviMate, IPTV Smarters, Kodi, OttPlayer ou SS IPTV):

\`\`\`text
${rawUrl}
\`\`\`

## Resumo dos Canais

Total de **${active.length} canais ativos** distribuídos em **${grouped.size} categorias**:

| Categoria | Quantidade |
| :--- | ---: |
${summaryRows}

## Como Usar

1. Abra o seu aplicativo de player IPTV.
2. Escolha a opção **Adicionar Lista via URL** (Playlist M3U).
3. Cole o link Raw: \`${rawUrl}\`
4. Salve e aguarde o carregamento automático dos canais e logotipos.

## Arquivos do Repositório

- \`${fileName}\` — Lista M3U formatada em UTF-8 com metadados \`tvg-id\`, \`tvg-logo\` e \`group-title\`.
${config.includeJson ? '- `canais.json` — Metadados estruturados dos canais em JSON.\n' : ''}- \`README.md\` — Documentação e índice atualizado da lista.

## Catálogo Completo

${detailedSections}
`;
}

export function generateChannelsJson(channels: Channel[]): string {
  const active = channels.filter((c) => c.enabled).map((ch, idx) => ({
    index: idx + 1,
    tvgId: ch.tvgId,
    name: ch.displayName,
    group: ch.groupTitle,
    logo: ch.tvgLogo,
    server: ch.serverLabel,
    url: ch.url,
  }));

  return JSON.stringify(
    {
      updatedAt: new Date().toISOString().slice(0, 10),
      totalChannels: active.length,
      channels: active,
    },
    null,
    2
  ) + '\n';
}

export function generateGitignore(): string {
  return `.DS_Store
Thumbs.db
*.tmp
*.bak
`;
}

export function generateMitLicense(username: string): string {
  const year = new Date().getFullYear();
  const owner = sanitizeSlug(username, 'seu-usuario');
  return `MIT License

Copyright (c) ${year} ${owner}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
`;
}

export function generateGitCommands(config: RepoConfig): string {
  const user = sanitizeSlug(config.username, 'seu-usuario');
  const repo = sanitizeSlug(config.repoName, 'lista-iptv-brasil');
  const branch = sanitizeSlug(config.branch, 'main');
  return `# 1. Extraia o arquivo ${repo}.zip e abra a pasta no terminal
cd ${repo}

# 2. Inicialize o repositório Git local
git init
git add .
git commit -m "Adiciona lista M3U inicial com canais organizados"

# 3. Conecte ao repositório criado no GitHub e envie
git branch -M ${branch}
git remote add origin https://github.com/${user}/${repo}.git
git push -u origin ${branch}`;
}

export function generateGhCliCommand(config: RepoConfig): string {
  const repo = sanitizeSlug(config.repoName, 'lista-iptv-brasil');
  const visFlag = config.visibility === 'private' ? '--private' : '--public';
  const descEscaped = config.description.replace(/"/g, '\\"');
  return `# Requer GitHub CLI (gh) autenticado via "gh auth login"
cd ${repo}
git init && git add . && git commit -m "Adiciona lista M3U inicial"
gh repo create ${repo} ${visFlag} --description "${descEscaped}" --source=. --remote=origin --push`;
}

export interface RepoFileEntry {
  name: string;
  description: string;
  language: 'm3u' | 'markdown' | 'json' | 'text';
  content: string;
  bytes: number;
}

export function buildRepoFiles(config: RepoConfig, channels: Channel[]): RepoFileEntry[] {
  const fileName = sanitizeFileName(config.fileName);
  const m3uContent = serializeM3U(channels, true);
  const readmeContent = generateReadme(config, channels);
  const gitignoreContent = generateGitignore();

  const enc = new TextEncoder();
  const files: RepoFileEntry[] = [
    {
      name: fileName,
      description: 'Playlist IPTV formatada (UTF-8)',
      language: 'm3u',
      content: m3uContent,
      bytes: enc.encode(m3uContent).length,
    },
    {
      name: 'README.md',
      description: 'Documentação, link Raw e tabela de canais',
      language: 'markdown',
      content: readmeContent,
      bytes: enc.encode(readmeContent).length,
    },
  ];

  if (config.includeJson) {
    const jsonContent = generateChannelsJson(channels);
    files.push({
      name: 'canais.json',
      description: 'Metadados estruturados em JSON',
      language: 'json',
      content: jsonContent,
      bytes: enc.encode(jsonContent).length,
    });
  }

  files.push({
    name: '.gitignore',
    description: 'Ignora arquivos temporários do sistema',
    language: 'text',
    content: gitignoreContent,
    bytes: enc.encode(gitignoreContent).length,
  });

  if (config.includeLicense) {
    const licenseContent = generateMitLicense(config.username);
    files.push({
      name: 'LICENSE',
      description: 'Licença MIT do repositório',
      language: 'text',
      content: licenseContent,
      bytes: enc.encode(licenseContent).length,
    });
  }

  return files;
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadRepoZip(config: RepoConfig, channels: Channel[]): Promise<void> {
  const zip = new JSZip();
  const repoSlug = sanitizeSlug(config.repoName, 'lista-iptv-brasil');
  const folder = zip.folder(repoSlug);
  const files = buildRepoFiles(config, channels);

  for (const file of files) {
    if (folder) {
      folder.file(file.name, file.content);
    } else {
      zip.file(file.name, file.content);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${repoSlug}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
