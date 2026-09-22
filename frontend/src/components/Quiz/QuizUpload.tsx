import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2, Sparkles, Upload, Clipboard, X } from 'lucide-react';
import type { ThemePalette } from '../../themes/palette';
import { extractTextFromFile } from '../../utils/ocr';

const COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

interface QuizUploadProps {
  colors: ThemePalette;
  questionCount: number;
  busy: boolean;
  remaining: number;
  lang: string;
  onQuestionCountChange: (n: number) => void;
  onSubmit: (text: string) => void;
}

function ChipButton({
  active,
  onClick,
  children,
  colors,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  colors: ThemePalette;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-9 h-9 rounded-xl text-[13px] font-extrabold transition-colors"
      style={{
        backgroundColor: active ? colors.accent : 'transparent',
        color: active ? '#fff' : colors.inkSoft,
        border: `1px solid ${active ? colors.accent : colors.cardBorder}`,
      }}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  colors,
  children,
}: {
  active: boolean;
  onClick: () => void;
  colors: ThemePalette;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-2"
      style={{
        backgroundColor: active ? `${colors.accent}15` : 'transparent',
        color: active ? colors.accent : colors.inkSoft,
      }}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export default function QuizUpload({
  colors,
  questionCount,
  busy,
  remaining,
  lang,
  onQuestionCountChange,
  onSubmit,
}: QuizUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const ocrLang = lang === 'en' ? 'eng' : 'ara';
  const pasteReady = pasteText.trim().length >= 10;
  const startDisabled = busy || extracting || (tab === 'paste' ? !pasteReady : !file);

  async function handleFile(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    setLocalError(null);
    setExtracting(true);
    try {
      const result = await extractTextFromFile(selected, ocrLang);
      if (result.text) {
        onSubmit(result.text);
        return;
      }
      if (result.error === 'too-large') setLocalError(t('quiz_file_too_large', 'That file is too large (max 10 MB).'));
      else if (result.error === 'unsupported') setLocalError(t('quiz_file_unsupported', 'Unsupported file. Use an image, PDF, or paste your notes.'));
      else if (result.error === 'ocr-unavailable') setLocalError(t('quiz_photo_unavailable', "Photo reading isn't available in this browser. Paste your notes instead."));
      else setLocalError(t('quiz_no_text', "We couldn't read any text from that file. Try pasting your notes instead."));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setExtracting(false);
    }
  }

  function handleStart() {
    if (busy || extracting) return;
    setLocalError(null);
    if (tab === 'paste') {
      onSubmit(pasteText.trim());
    } else if (file) {
      void handleFile(file);
    }
  }

  return (
    <div className="rounded-3xl border p-6 space-y-5"
      style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
      {/* Question count */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
            {t('quiz_count_label', 'Number of questions')}
          </span>
          {remaining < 3 && (
            <span className="text-[11px] font-bold" style={{ color: colors.pink }}>
              {t('quiz_daily_remaining', { count: remaining, defaultValue: '{{count}} quiz generations left today' })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((n) => (
            <ChipButton key={n} active={n === questionCount} onClick={() => onQuestionCountChange(n)} colors={colors}>
              {n}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ backgroundColor: colors.cardBorder }}>
        <TabButton active={tab === 'upload'} onClick={() => setTab('upload')} colors={colors}>
          <Upload size={14} />
          {t('quiz_upload_tab', 'Upload')}
        </TabButton>
        <TabButton active={tab === 'paste'} onClick={() => setTab('paste')} colors={colors}>
          <Clipboard size={14} />
          {t('quiz_paste_tab', 'Paste text')}
        </TabButton>
      </div>

      {tab === 'upload' ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          {extracting ? (
            <div className="flex items-center justify-center gap-2 py-6 rounded-2xl"
              style={{ backgroundColor: `${colors.accent}08`, border: `1px dashed ${colors.cardBorder}` }}>
              <Loader2 size={18} className="animate-spin" style={{ color: colors.accent }} />
              <span className="text-[13px] font-semibold" style={{ color: colors.inkSoft }}>
                {t('quiz_generating', 'Reading…')}
              </span>
            </div>
          ) : file ? (
            <div className="flex items-center gap-3 py-3 px-4 rounded-2xl"
              style={{ backgroundColor: `${colors.accent}10` }}>
              <FileText size={18} style={{ color: colors.accent }} />
              <span className="flex-1 min-w-0 text-[13px] font-semibold truncate" style={{ color: colors.ink }}>
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="p-1.5 rounded-lg hover:opacity-70"
                style={{ color: colors.inkSoft }}
                aria-label={t('quiz_clear_file', 'Remove file')}
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-7 rounded-2xl text-[13px] font-semibold transition-colors border border-dashed"
              style={{ borderColor: colors.cardBorder, color: colors.inkSoft }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Upload size={20} style={{ color: colors.accent }} />
                {t('quiz_choose_file', 'Choose a photo or PDF')}
                <span className="text-[11px]" style={{ color: colors.inkFaint }}>
                  {t('quiz_upload_hint', 'Photo or PDF of the material you studied')}
                </span>
              </div>
            </button>
          )}
        </div>
      ) : (
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder={t('quiz_paste_placeholder', 'Paste your study notes here…')}
            className="w-full resize-none rounded-2xl p-4 text-[13px] outline-none transition-colors"
            style={{ backgroundColor: `${colors.accent}08`, border: `1px solid ${colors.cardBorder}`, color: colors.ink }}
          />
          <p className="mt-1.5 text-[11px]" style={{ color: colors.inkFaint }}>
            {t('quiz_paste_hint', 'Need at least a few sentences so the AI has material to work with.')}
          </p>
        </div>
      )}

      {localError && (
        <p className="text-[12px] font-semibold" style={{ color: colors.pink }}>{localError}</p>
      )}

      {/* Start */}
      <button
        type="button"
        onClick={handleStart}
        disabled={startDisabled}
        className="w-full py-3.5 rounded-2xl text-[14px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
        style={{
          backgroundColor: colors.accent,
          color: '#fff',
          boxShadow: colors.clayShadow ? '4px 4px 10px rgba(0,0,0,0.15)' : undefined,
        }}
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {t('quiz_generating', 'Creating your quiz…')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Sparkles size={16} />
            {t('quiz_start', 'Create quiz')}
          </span>
        )}
      </button>
    </div>
  );
}