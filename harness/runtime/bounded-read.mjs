import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PAGE_CHARS = 12000;
const decode = s => s.replace(/&(?:#(x[\da-f]+|\d+)|(amp|lt|gt|quot|apos|nbsp));/gi, (_, n, name) => {
  if (n) {
    const value = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
    return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '\ufffd';
  }
  return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[name.toLowerCase()];
});
const clean = s => decode(s).replace(/\s+/g, ' ').trim();

// Extract text without evaluating scripts. Preserve source lines for follow-up.
export function extractHtml(source) {
  const sections = [{ title: 'Начало', line: 1, records: [] }];
  const scripts = [];
  const token = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<[^>]*>|[^<]+/gi;
  let line = 1, last = 0, heading = null;
  for (const match of source.matchAll(token)) {
    line += (source.slice(last, match.index).match(/\n/g) || []).length;
    last = match.index;
    const raw = match[0];
    if (/^<!--|^<style\b/i.test(raw)) continue;
    if (/^<script\b/i.test(raw)) {
      const contentStart = raw.indexOf('>') + 1;
      const content = raw.slice(contentStart).replace(/<\/script\s*>$/i, '');
      scripts.push({ line, content });
      continue;
    }
    if (/^<h[12]\b/i.test(raw)) { heading = { line, text: [] }; continue; }
    if (/^<\/h[12]/i.test(raw)) {
      if (heading) sections.push({ title: heading.text.join(' '), line: heading.line, records: [] });
      heading = null; continue;
    }
    if (raw.startsWith('<')) continue;
    const text = clean(raw);
    if (!text) continue;
    if (heading) heading.text.push(text);
    else sections.at(-1).records.push({ line, text });
  }
  const scriptRecords = [];
  // Read quoted literals, not complete minified source. Templates stay static text.
  const literals = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gs;
  for (const script of scripts) {
    for (const match of script.content.matchAll(literals)) {
      let text = match[0].slice(1, -1);
      text = text.replace(/\\u\{([\da-f]+)\}|\\u([\da-f]{4})|\\x([\da-f]{2})/gi,
        (_, a, b, c) => {
          const n = parseInt(a || b || c, 16);
          return n <= 0x10ffff ? String.fromCodePoint(n) : '\ufffd';
        }).replace(/\\([nrt])/g, ' ').replace(/\\(["'`\\])/g, '$1');
      text = clean(text.replace(/<[^>]+>/g, ' '));
      if (/[а-яё]{3}/i.test(text)) scriptRecords.push({
        line: script.line + (script.content.slice(0, match.index).match(/\n/g) || []).length,
        text
      });
    }
  }
  return { sections: sections.filter(x => x.title || x.records.length), scriptRecords };
}

export function pageText(records, page = 1) {
  if (!Number.isInteger(page) || page < 1) throw new Error('page must be a positive integer');
  const rows = records.map(r => `L${r.line}: ${r.text}`);
  const chunks = [];
  let current = '';
  for (let row of rows) {
    while (row.length) {
      const room = PAGE_CHARS - current.length;
      if (room < 2) { chunks.push(current); current = ''; continue; }
      const part = row.slice(0, room - 1);
      current += part + '\n'; row = row.slice(part.length);
      if (row.length) { chunks.push(current); current = ''; }
    }
  }
  if (current || !chunks.length) chunks.push(current);
  if (page > chunks.length) throw new Error(`Only ${chunks.length} pages`);
  return { text: chunks[page - 1], page, pages: chunks.length };
}

export function render(mode, file, options = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const html = /\.html?$/i.test(file);
  const parsed = html ? extractHtml(source) : { sections: [{ title: path.basename(file), line: 1,
    records: source.split(/\r?\n/).map((text, i) => ({ line: i + 1, text })) }], scriptRecords: [] };
  if (mode === 'overview') {
    const catalog = parsed.sections.map((s, i) => ({ line: s.line,
      text: `${i + 1}. ${s.title.slice(0, 180)} (${s.records.reduce((n, r) => n + r.text.length, 0)} chars)` }));
    const result = pageText(catalog, Number(options.page || 1));
    return `overview; page ${result.page}/${result.pages}; ${Buffer.byteLength(source)} bytes; ${parsed.sections.length} sections; ${parsed.scriptRecords.length} script literals\n${result.text}`;
  }
  let records;
  if (mode === 'read') {
    const section = Number(options.section || 1);
    if (!Number.isInteger(section) || !parsed.sections[section - 1]) throw new Error('Unknown section');
    records = parsed.sections[section - 1].records;
  } else if (mode === 'scripts') records = parsed.scriptRecords;
  else if (mode === 'lines') {
    const from = Number(options.from), to = Number(options.to);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to - from > 200)
      throw new Error('Provide an explicit range of at most 201 lines');
    records = source.split(/\r?\n/).slice(from - 1, to).map((text, i) => ({ line: from + i, text }));
  } else throw new Error('Mode: overview, read, scripts, lines');
  const result = pageText(records, Number(options.page || 1));
  return `${mode}; page ${result.page}/${result.pages}; source ${path.resolve(file)}\n${result.text}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, file, ...rest] = process.argv.slice(2), options = {};
    if (!mode || !file || rest.length % 2) throw new Error('Usage: MODE FILE [--section N] [--page N]');
    for (let i = 0; i < rest.length; i += 2) options[rest[i].replace(/^--/, '')] = rest[i + 1];
    console.log(render(mode, file, options));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
