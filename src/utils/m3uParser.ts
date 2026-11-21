export interface Channel {
  id: string;
  tvgId: string;
  tvgName: string;
  tvgLogo: string;
  groupTitle: string;
  displayName: string;
  url: string;
  serverLabel: string;
  enabled: boolean;
}

export interface ParseResult {
  channels: Channel[];
  repairedLineBreaks: boolean;
  warnings: string[];
}

function extractAttr(header: string, attrName: string): string {
  const regex = new RegExp(`${attrName}="([^"]*)"`, 'i');
  const match = header.match(regex);
  return match ? match[1].trim() : '';
}

export function detectServerLabel(name: string, url: string): string {
  const nameMatch = name.match(/\((Speed\s*\d+|App Android)\)/i);
  if (nameMatch) return nameMatch[1];
  const urlMatch = url.match(/speed-(\d+)/i);
  if (urlMatch) return `Speed ${urlMatch[1]}`;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return 'Externo';
  }
}

/**
 * Normalizes single-line or messy M3U text into standard multi-line M3U entries
 * and parses all #EXTINF + stream URL pairs cleanly.
 */
export function parseM3U(rawInput: string): ParseResult {
  const trimmed = rawInput.trim();
  const warnings: string[] = [];

  if (!trimmed) {
    return { channels: [], repairedLineBreaks: false, warnings: ['Conteúdo vazio.'] };
  }

  const originalLineCount = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0).length;

  // Step 1: Ensure #EXTM3U is followed by a newline, and every #EXTINF starts on a new line
  let normalized = trimmed
    .replace(/\r\n/g, '\n')
    .replace(/#EXTM3U\s*(?=#EXTINF)/gi, '#EXTM3U\n')
    .replace(/(?<!\n)(#EXTINF:)/gi, '\n$1');

  // Step 2: Split each #EXTINF line cleanly from a glued stream URL (https:// or http://)
  // Carefully avoids splitting inside tvg-logo="https://..." because the display name follows the final comma after the attributes.
  const rawLines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  const expandedLines: string[] = [];

  for (const line of rawLines) {
    if (line.toUpperCase().startsWith('#EXTINF:')) {
      // Find the comma separating attributes from the channel title.
      // Walk outside quotes to find the true attribute/title separator comma.
      let inQuotes = false;
      let separatorCommaIdx = -1;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) {
          separatorCommaIdx = i;
          break;
        }
      }

      if (separatorCommaIdx !== -1) {
        const attrPart = line.slice(0, separatorCommaIdx + 1);
        const tail = line.slice(separatorCommaIdx + 1);
        // Check if an http:// or https:// URL is glued onto the end of the title
        const gluedUrlMatch = tail.match(/(https?:\/\/\S+)$/i);
        if (gluedUrlMatch && gluedUrlMatch.index !== undefined) {
          const titlePart = tail.slice(0, gluedUrlMatch.index).trim();
          const urlPart = gluedUrlMatch[1].trim();
          expandedLines.push(`${attrPart}${titlePart}`);
          expandedLines.push(urlPart);
          continue;
        }
      }
      expandedLines.push(line);
    } else {
      expandedLines.push(line);
    }
  }

  const repairedLineBreaks = expandedLines.length > originalLineCount + 1;

  const channels: Channel[] = [];
  let pendingExtinf: string | null = null;
  let counter = 1;

  for (const line of expandedLines) {
    if (line.toUpperCase().startsWith('#EXTM3U')) {
      continue;
    }

    if (line.toUpperCase().startsWith('#EXTINF:')) {
      if (pendingExtinf) {
        warnings.push(`Entrada #EXTINF sem URL de stream encontrada antes da linha ${counter}.`);
      }
      pendingExtinf = line;
      continue;
    }

    if (line.startsWith('#')) {
      // Other directives like #EXTVLCOPT
      continue;
    }

    // Stream URL line
    if (pendingExtinf) {
      let inQuotes = false;
      let commaIdx = -1;
      for (let i = 0; i < pendingExtinf.length; i++) {
        if (pendingExtinf[i] === '"') inQuotes = !inQuotes;
        else if (pendingExtinf[i] === ',' && !inQuotes) {
          commaIdx = i;
          break;
        }
      }

      const metaPart = commaIdx !== -1 ? pendingExtinf.slice(0, commaIdx) : pendingExtinf;
      const displayName = commaIdx !== -1 ? pendingExtinf.slice(commaIdx + 1).trim() : `Canal ${counter}`;

      const tvgId = extractAttr(metaPart, 'tvg-id');
      const tvgName = extractAttr(metaPart, 'tvg-name') || displayName;
      const tvgLogo = extractAttr(metaPart, 'tvg-logo');
      const groupTitle = extractAttr(metaPart, 'group-title') || 'Geral';
      const url = line.trim();

      channels.push({
        id: `ch-${counter}-${Math.random().toString(36).slice(2, 7)}`,
        tvgId,
        tvgName,
        tvgLogo,
        groupTitle,
        displayName: displayName || tvgName,
        url,
        serverLabel: detectServerLabel(displayName || tvgName, url),
        enabled: true,
      });

      counter++;
      pendingExtinf = null;
    } else if (/^https?:\/\//i.test(line)) {
      channels.push({
        id: `ch-${counter}-${Math.random().toString(36).slice(2, 7)}`,
        tvgId: '',
        tvgName: `Canal ${counter}`,
        tvgLogo: '',
        groupTitle: 'Geral',
        displayName: `Canal ${counter}`,
        url: line.trim(),
        serverLabel: detectServerLabel('', line.trim()),
        enabled: true,
      });
      counter++;
    }
  }

  if (pendingExtinf) {
    warnings.push('Última entrada #EXTINF não possui URL de stream.');
  }

  return { channels, repairedLineBreaks, warnings };
}

export function serializeM3U(channels: Channel[], includeOnlyEnabled = true): string {
  const list = includeOnlyEnabled ? channels.filter((c) => c.enabled) : channels;
  const lines: string[] = ['#EXTM3U'];

  for (const ch of list) {
    const attrs: string[] = [];
    if (ch.tvgId) attrs.push(`tvg-id="${ch.tvgId.replace(/"/g, '')}"`);
    if (ch.tvgName) attrs.push(`tvg-name="${ch.tvgName.replace(/"/g, '')}"`);
    if (ch.tvgLogo) attrs.push(`tvg-logo="${ch.tvgLogo.replace(/"/g, '')}"`);
    if (ch.groupTitle) attrs.push(`group-title="${ch.groupTitle.replace(/"/g, '')}"`);

    const attrPrefix = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    const title = ch.displayName || ch.tvgName || 'Canal sem nome';

    lines.push(`#EXTINF:-1${attrPrefix},${title}`);
    lines.push(ch.url.trim());
  }

  return lines.join('\n') + '\n';
}

export interface ValidationReport {
  totalChannels: number;
  activeChannels: number;
  categoriesCount: number;
  invalidUrls: number;
  duplicateUrls: number;
  missingLogos: number;
  lineCount: number;
}

export function validateChannels(channels: Channel[]): ValidationReport {
  const active = channels.filter((c) => c.enabled);
  const categories = new Set(active.map((c) => c.groupTitle));
  const seenUrls = new Set<string>();
  let duplicateUrls = 0;
  let invalidUrls = 0;
  let missingLogos = 0;

  for (const ch of active) {
    const u = ch.url.trim();
    if (!/^https?:\/\/.+/i.test(u)) {
      invalidUrls++;
    }
    if (seenUrls.has(u)) {
      duplicateUrls++;
    } else {
      seenUrls.add(u);
    }
    if (!ch.tvgLogo.trim()) {
      missingLogos++;
    }
  }

  return {
    totalChannels: channels.length,
    activeChannels: active.length,
    categoriesCount: categories.size,
    invalidUrls,
    duplicateUrls,
    missingLogos,
    lineCount: active.length * 2 + 1,
  };
}
