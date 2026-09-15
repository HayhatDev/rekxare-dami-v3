import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLangStore } from '../stores/useLangStore';

interface StreakCalendarProps {
  streak: number;
  lastStudyDate: string | null;
  accent: string;
  accentSoft: string;
  inkFaint: string;
  card: string;
}

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ar: 'ar',
  sorani: 'ckb',
  badini: 'kmr',
};

function resolveMonthFormatter(lang: string): (d: Date) => string {
  const candidates = [LOCALE_MAP[lang], 'en'].filter(Boolean) as string[];
  for (const locale of candidates) {
    try {
      if (!Intl.DateTimeFormat.supportedLocalesOf([locale]).length) continue;
      const fmt = new Intl.DateTimeFormat(locale, { month: 'short' });
      return (d: Date) => fmt.format(d);
    } catch {
      continue;
    }
  }
  return (d: Date) => d.toLocaleDateString('en', { month: 'short' });
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function StreakCalendar({ streak, lastStudyDate, accent, accentSoft, inkFaint, card }: StreakCalendarProps) {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);

  const weeks = useMemo(() => {
    const totalDays = 91; // ~13 weeks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=Sun
    const totalCells = totalDays + dayOfWeek + 1;

    const studyDays = new Set<string>();
    if (streak > 0 && lastStudyDate) {
      const last = new Date(lastStudyDate);
      last.setHours(0, 0, 0, 0);
      for (let i = 0; i < streak; i++) {
        const d = new Date(last);
        d.setDate(d.getDate() - i);
        studyDays.add(formatDateKey(d));
      }
    }

    const cells: { date: Date; studied: boolean; isToday: boolean; future: boolean }[][] = [];
    let currentWeek: typeof cells[0] = [];

    // Pad start
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays - dayOfWeek);

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = formatDateKey(d);
      const isToday = d.getTime() === today.getTime();
      const future = d.getTime() > today.getTime();
      currentWeek.push({ date: d, studied: studyDays.has(key), isToday, future });
      if (currentWeek.length === 7) {
        cells.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) cells.push(currentWeek);
    return cells;
  }, [streak, lastStudyDate]);

  const formatMonth = useMemo(() => resolveMonthFormatter(lang), [lang]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const month = week[0]?.date.getMonth();
      if (month !== undefined && month !== lastMonth) {
        labels.push({ label: formatMonth(week[0].date), index: wi });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks, formatMonth]);

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <p className="text-xs font-bold truncate" style={{ color: inkFaint }}>
          {t('streak', 'Streak')} · {streak} {t('streak_days', 'days')}
        </p>
        {/* Legend */}
        <div className="ml-auto hidden sm:flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: inkFaint }}>
            <span className="w-2 h-2 rounded-[3px] inline-block" style={{ backgroundColor: accent }} />
            {t('streak_legend_done', 'Studied')}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: inkFaint }}>
            <span className="w-2 h-2 rounded-[3px] inline-block" style={{ boxShadow: `inset 0 0 0 1.5px ${accent}` }} />
            {t('streak_legend_today', 'Today')}
          </span>
        </div>
      </div>

      {/* Month labels */}
      <div className="relative flex mb-1 overflow-hidden h-[11px]" style={{ paddingLeft: '18px' }}>
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="text-[10px] font-medium absolute whitespace-nowrap"
            style={{
              color: inkFaint,
              left: `calc(${m.index} * ((100% - 18px) / ${weeks.length}))`,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-0 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1 justify-center shrink-0">
          {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
            <span key={i} className="text-[7px] sm:text-[8px] leading-[10px] font-medium h-[10px]" style={{ color: inkFaint }}>{d}</span>
          ))}
        </div>
        {/* Grid - responsive sizing */}
        <div className="flex gap-[2px] sm:gap-[3px] min-w-0 flex-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px] sm:gap-[3px] min-w-0 flex-1">
              {week.map((cell, di) => {
                const label = `${formatMonth(cell.date)} ${cell.date.getDate()}`;
                return (
                  <div
                    key={di}
                    title={cell.future ? undefined : `${label}${cell.studied ? ` · ${t('streak_legend_done', 'Studied')}` : ''}`}
                    aria-hidden={cell.future}
                    className={`aspect-square rounded-[2px] transition-transform duration-150 min-w-0 ${
                      cell.future ? 'cursor-default' : 'hover:scale-[1.45] hover:rounded-[3px]'
                    }`}
                    style={{
                      backgroundColor: cell.future
                        ? 'transparent'
                        : cell.studied
                          ? accent
                          : cell.isToday
                            ? accentSoft
                            : `${accent}12`,
                      boxShadow:
                        cell.isToday && !cell.future
                          ? `0 0 0 1.5px ${accent}, ${cell.studied ? `0 0 6px ${accent}40` : 'none'}`
                          : cell.studied
                            ? `0 0 6px ${accent}40`
                            : 'none',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
