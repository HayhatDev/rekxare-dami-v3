import { createRecallCard, type ReviewCard } from './srs';

export type ImportFormat = 'anki' | 'quizlet' | 'delimited';

export interface ImportSkip {
  line: number;
  reason: string;
}

export interface ImportResult {
  cards: ReviewCard[];
  format: ImportFormat;
  /** Lines that could not be turned into a card, with the reason. */
  skipped: ImportSkip[];
  /** Non-fatal problems worth surfacing before the user commits. */
  warnings: string[];
}

const NAME_KEYS = ['front', 'term', 'question', 'word', 'prompt', 'definition_a'];
const BACK_KEYS = ['back', 'definition', 'answer', 'meaning', 'translation'];

/**
 * Anki exports wrap nearly every field in HTML and join lines with newlines.
 * Rendering that raw shows markup to the student, and a raw newline inside a
 * TSV cell would break column alignment, so both are flattened to spaces.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<\s*\/\s*(div|p|li|tr)\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits one delimited line, honouring double-quoted fields that contain the
 * delimiter. Hand-rolled because CSV in a quoted field is common in real
 * exports and a naive split silently produces shifted columns.
 */
export function splitDelimited(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

/** Anki text exports open with directive lines that are not card data. */
export function parseAnkiDirectives(lines: string[]): {
  separator: string;
  front: number;
  back: number;
  body: string[];
  found: boolean;
} {
  let separator = '\t';
  let front = 0;
  let back = 1;
  let found = false;
  const body: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#separator:')) {
      const raw = line.slice('#separator:'.length).trim();
      separator = raw === 'tab' ? '\t' : raw === 'space' ? ' ' : (raw || '\t');
      found = true;
    } else if (line.startsWith('#notetype column:')) {
      const n = Number(line.split(':').pop());
      if (Number.isInteger(n) && n > 0) front = n - 1;
      found = true;
    } else if (line.startsWith('#deck column:') || line.startsWith('#tags column:')) {
      found = true;
    } else if (line.startsWith('#')) {
      // #html:true, #allowDuplicate:true and friends carry no column layout.
      found = true;
    } else {
      body.push(line);
    }
  }

  return { separator, front, back: front + 1, body, found };
}

function isHeaderRow(cells: string[]): boolean {
  return cells.some((c) => NAME_KEYS.includes(stripHtml(c).toLowerCase().trim()));
}

function headerIndexes(cells: string[]): { front: number; back: number } | null {
  const normalized = cells.map((c) => stripHtml(c).toLowerCase().trim());
  const front = normalized.findIndex((c) => NAME_KEYS.includes(c));
  let back = normalized.findIndex((c) => BACK_KEYS.includes(c));
  if (front === -1 || back === -1 || back === front) return null;
  return { front, back };
}

export function detectFormat(text: string): ImportFormat {
  const firstLines = text.split(/\r?\n/).slice(0, 40).join('\n');
  if (/^#separator:/m.test(firstLines) || /^#notetype column:/m.test(firstLines)) return 'anki';
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return 'delimited';
  // Quizlet exports are tab separated with no header row.
  if (lines.every((l) => l.split('\t').length >= 2) && !isHeaderRow(lines[0].split('\t'))) {
    return 'quizlet';
  }
  return 'delimited';
}

function build(
  rows: { front: string; back: string }[],
  skipped: ImportSkip[],
  subject: string,
  deck: string,
  now: Date
): ImportResult['cards'] {
  const seen = new Set<string>();
  const cards: ReviewCard[] = [];
  rows.forEach((row, i) => {
    const front = row.front.trim();
    const back = row.back.trim();
    if (!front) {
      skipped.push({ line: i + 1, reason: 'empty_front' });
      return;
    }
    if (!back) {
      skipped.push({ line: i + 1, reason: 'empty_back' });
      return;
    }
    const card = createRecallCard(front, back, subject, deck, now);
    if (seen.has(card.id)) {
      skipped.push({ line: i + 1, reason: 'duplicate' });
      return;
    }
    seen.add(card.id);
    cards.push(card);
  });
  return cards;
}

export function parseDeck(
  text: string,
  subject: string,
  deck: string,
  now: Date = new Date()
): ImportResult {
  const warnings: string[] = [];
  const skipped: ImportSkip[] = [];
  const lines = text.split(/\r?\n/);
  const format = detectFormat(text);

  if (lines.every((l) => l.trim().length === 0)) {
    return { cards: [], format, skipped, warnings: ['empty_file'] };
  }

  if (format === 'anki') {
    const { separator, front, back, body } = parseAnkiDirectives(lines);
    if (!body.length) {
      return { cards: [], format, skipped, warnings: ['no_rows'] };
    }
    const rows: { front: string; back: string }[] = [];
    body.forEach((line, i) => {
      if (line.trim().length === 0) return;
      const cells = splitDelimited(line, separator);
      rows.push({ front: stripHtml(cells[front] ?? ''), back: stripHtml(cells[back] ?? '') });
      if (cells.length <= back) {
        skipped.push({ line: i + 1, reason: 'too_few_columns' });
      }
    });
    const cards = build(rows, skipped, subject, deck, now);
    if (!cards.length && skipped.length) warnings.push('all_rows_rejected');
    return { cards, format, skipped, warnings };
  }

  // Quizlet and delimited exports: guess the delimiter from the first rows.
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const sample = nonEmpty.slice(0, 20);
  const counts = [
    ['\t', sample.filter((l) => l.includes('\t')).length],
    [',', sample.filter((l) => l.includes(',')).length],
    [';', sample.filter((l) => l.includes(';')).length],
  ] as const;
  const [delimiter, hits] = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (hits === 0) {
    return { cards: [], format, skipped, warnings: ['no_delimiter_found'] };
  }

  let offset = 0;
  let frontIdx = 0;
  let backIdx = 1;

  const header = splitDelimited(nonEmpty[0], delimiter);
  const mapped = headerIndexes(header);
  if (mapped) {
    offset = 1;
    frontIdx = mapped.front;
    backIdx = mapped.back;
  } else if (header.length >= 2 && /^[A-Za-z0-9_.]+$/.test(stripHtml(header[0]))) {
    // No recognised header, but a lone token on the first row looks like one.
    warnings.push('header_guessed');
  }

  const rows: { front: string; back: string }[] = [];
  nonEmpty.slice(offset).forEach((line, i) => {
    const cells = splitDelimited(line, delimiter);
    if (cells.length <= Math.max(frontIdx, backIdx)) {
      skipped.push({ line: i + offset + 1, reason: 'too_few_columns' });
      return;
    }
    rows.push({ front: stripHtml(cells[frontIdx]), back: stripHtml(cells[backIdx]) });
  });

  const cards = build(rows, skipped, subject, deck, now);
  if (!cards.length && skipped.length) warnings.push('all_rows_rejected');
  return { cards, format, skipped, warnings };
}