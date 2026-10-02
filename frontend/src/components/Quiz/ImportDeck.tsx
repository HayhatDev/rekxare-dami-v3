import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, FileUp, Upload, X } from 'lucide-react';
import type { ThemePalette } from '../../themes/palette';
import { MAX_REVIEW_CARDS, deckId, type ReviewCard } from '../../utils/srs';
import { parseDeck, type ImportResult } from '../../utils/deckImport';
import { dayKey } from '../../utils/sessionLog';
import { STATUS_COLORS } from '../../utils/constants';

interface ImportDeckProps {
  colors: ThemePalette;
  initialSubject: string;
  /** How many more cards the library can hold before hitting its cap. */
  room: number;
  onImport: (cards: ReviewCard[], subject: string) => Promise<void> | void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function ImportDeck({ colors, initialSubject, room, onImport }: ImportDeckProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subjects = t('subjects', { returnObjects: true }) as string[];
  const options = subjects?.length ? subjects : [initialSubject];

  // Imported cards land in a deck named for the subject and the day, matching
  // the deck id the rest of the app uses for that subject.
  const preview = (raw: string, forSubject: string) => parseDeck(raw, forSubject, deckId(forSubject, dayKey(new Date())));

  function reset() {
    setText('');
    setResult(null);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function readFile(file: File) {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError(t('import_file_too_large', 'That file is over 5 MB.'));
      return;
    }
    try {
      const raw = await file.text();
      setText(raw);
      setResult(preview(raw, subject));
    } catch {
      setError(t('import_read_failed', 'Could not read that file.'));
    }
  }

  async function commit() {
    if (!result || result.cards.length === 0 || room === 0) return;
    setSaving(true);
    try {
      await onImport(result.cards.slice(0, room), subject);
      close();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border px-4 py-3 flex items-center justify-center gap-2 text-[13px] font-bold transition-transform active:scale-[0.99]"
        style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.inkSoft }}
      >
        <FileUp size={15} />
        {t('import_open', 'Import a deck')}
      </button>
    );
  }

  const found = result?.cards.length ?? 0;
  const libraryFull = room === 0;
  const willSkip = found > room;
  const importing = Math.min(found, room);

  return (
    <div className="rounded-3xl border p-5 space-y-4"
      style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-extrabold" style={{ color: colors.ink }}>
          {t('import_title', 'Import a deck')}
        </p>
        <button type="button" onClick={close} aria-label={t('import_close', 'Close')}
          style={{ color: colors.inkFaint }}>
          <X size={16} />
        </button>
      </div>

      {!result && (
        <>
          <p className="text-[12px]" style={{ color: colors.inkFaint }}>
            {t('import_hint', 'Anki, Quizlet, or a CSV with front and back columns.')}
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,.tsv,.tab,text/plain,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-2xl text-[13px] font-extrabold transition-transform active:scale-[0.98]"
            style={{ backgroundColor: `${colors.accent}15`, color: colors.accent, border: `1px solid ${colors.accent}33` }}
          >
            {t('import_choose_file', 'Choose a file')}
          </button>

          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
            <span className="flex-1 h-px" style={{ backgroundColor: colors.cardBorder }} />
            {t('import_or', 'or')}
            <span className="flex-1 h-px" style={{ backgroundColor: colors.cardBorder }} />
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={t('import_paste_placeholder', 'front\tback\nhello\tsalama')}
            className="w-full px-3 py-2.5 rounded-2xl text-[12px] font-mono resize-y outline-none"
            style={{
              backgroundColor: `${colors.accent}08`,
              border: `1px solid ${colors.cardBorder}`,
              color: colors.ink,
            }}
          />

          {error && (
            <p className="text-[12px] font-semibold" style={{ color: STATUS_COLORS.danger }}>{error}</p>
          )}

          <button
            type="button"
            disabled={text.trim().length === 0}
            onClick={() => setResult(preview(text, subject))}
            className="w-full py-3 rounded-2xl text-[13px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: colors.accent, color: '#fff' }}
          >
            {t('import_preview', 'Preview')}
          </button>
        </>
      )}

      {result && (
        <>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold"
              style={{ backgroundColor: `${STATUS_COLORS.success}18`, color: STATUS_COLORS.success }}>
              <Check size={12} strokeWidth={3} />
              {t('import_found', '{{count}} cards ready', { count: found })}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
              {result.format}
            </span>
          </div>

          {found === 0 && (
            <p className="text-[12px] font-semibold" style={{ color: STATUS_COLORS.danger }}>
              {t('import_none_found', 'No usable cards found in that file.')}
            </p>
          )}

          {libraryFull ? (
            <div className="flex items-start gap-2 rounded-2xl p-3"
              style={{ backgroundColor: `${STATUS_COLORS.danger}14`, border: `1px solid ${STATUS_COLORS.danger}40` }}>
              <AlertTriangle size={15} className="shrink-0 mt-px" style={{ color: STATUS_COLORS.danger }} />
              <p className="text-[12px] leading-relaxed" style={{ color: colors.inkSoft }}>
                {t('import_full', 'Your library is already full at {{max}} cards. Clear some cards before importing more.',
                  { max: MAX_REVIEW_CARDS })}
              </p>
            </div>
          ) : willSkip && (
            <div className="flex items-start gap-2 rounded-2xl p-3"
              style={{ backgroundColor: `${STATUS_COLORS.warning}14`, border: `1px solid ${STATUS_COLORS.warning}40` }}>
              <AlertTriangle size={15} className="shrink-0 mt-px" style={{ color: STATUS_COLORS.warning }} />
              <p className="text-[12px] leading-relaxed" style={{ color: colors.inkSoft }}>
                {t('import_capped', 'You have room for {{room}} more cards ({{max}} total), so only the first {{importing}} of {{found}} will be imported and {{skipped}} left out. Review the ones you already have, or import in smaller batches by subject.',
                  { room, max: MAX_REVIEW_CARDS, importing, found, skipped: found - importing })}
              </p>
            </div>
          )}

          {result.skipped.length > 0 && (
            <p className="text-[11px]" style={{ color: colors.inkFaint }}>
              {t('import_skipped', '{{count}} rows skipped (empty, duplicate, or malformed).', { count: result.skipped.length })}
            </p>
          )}

          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {result.cards.slice(0, 12).map((c) => (
              <div key={c.id} className="rounded-xl px-3 py-2 text-[12px]"
                style={{ backgroundColor: `${colors.accent}08` }}>
                <p className="font-bold truncate" style={{ color: colors.ink }}>{c.question}</p>
                <p className="truncate" style={{ color: colors.inkFaint }}>{c.answer}</p>
              </div>
            ))}
            {result.cards.length > 12 && (
              <p className="text-[11px] px-1" style={{ color: colors.inkFaint }}>
                {t('import_more', '+{{count}} more', { count: result.cards.length - 12 })}
              </p>
            )}
          </div>

          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
              {t('import_subject', 'Subject')}
            </span>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setResult(preview(text, e.target.value));
              }}
              className="mt-1 w-full px-3 py-2.5 rounded-2xl text-[13px] outline-none"
              style={{ backgroundColor: `${colors.accent}08`, border: `1px solid ${colors.cardBorder}`, color: colors.ink }}
            >
              {options.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-3 rounded-2xl text-[13px] font-extrabold"
              style={{ border: `1px solid ${colors.cardBorder}`, color: colors.inkSoft }}
            >
              {t('import_cancel', 'Back')}
            </button>
            <button
              type="button"
              disabled={found === 0 || libraryFull || saving}
              onClick={() => void commit()}
              className="flex-1 py-3 rounded-2xl text-[13px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40"
              style={{ backgroundColor: colors.accent, color: '#fff' }}
            >
              {saving ? t('import_importing', 'Importing…') : t('import_confirm', 'Import {{count}} cards', { count: importing })}
            </button>
          </div>
        </>
      )}
    </div>
  );
}