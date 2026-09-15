import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeStore } from '../../stores/useThemeStore';
import { useLangStore } from '../../stores/useLangStore';
import { useStudyData } from '../../hooks/useStudyData';
import { useSchedule } from '../../hooks/useSchedule';
import { useCycleLang } from '../../hooks/useCycleLang';
import { formatTime } from '../../utils/helpers';
import { User, LogOut, Timer, Calendar, BarChart3, Moon, Sun, Globe, X, Download } from 'lucide-react';

interface ProfileDrawerProps {
  ink: string;
  inkFaint: string;
  card: string;
  cardBorder?: string;
  btnStyle?: React.CSSProperties;
}

export default function ProfileDrawer({ ink, inkFaint, card, cardBorder, btnStyle }: ProfileDrawerProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user, isGuest, signOut } = useAuth();
  const { isDark, toggleDark } = useThemeStore();
  const { lang } = useLangStore();
  const { cycleLang } = useCycleLang();
  const { data: studyData } = useStudyData();
  const { data: scheduleData } = useSchedule();
  const isRTL = lang === 'ar' || lang === 'badini' || lang === 'sorani';

  const handleExport = () => {
    try {
      const payload = {
        app: 'rekxare-dami',
        version: 1,
        exported_at: new Date().toISOString(),
        study_data: studyData,
        schedule: scheduleData,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekxare-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('exported_ok', 'Your progress has been exported'));
    } catch {
      toast.error(t('ai_error_hint', 'Failed to export data. Please try again.'));
    }
  };

  // Enter/exit animation state machine:
  // rendered = mounted in DOM · shown = animation phase applied
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [shown, setShown] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openDrawer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setRendered(true);
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  };

  const closeDrawer = () => {
    setShown(false);
    setOpen(false);
    closeTimerRef.current = setTimeout(() => setRendered(false), 320);
  };

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const name = isGuest
    ? t('guest_label', 'Guest')
    : (user?.user_metadata?.full_name || user?.email || t('default_user'));
  const email = user?.email;
  const avatar = user?.user_metadata?.avatar_url || undefined;

  // Google avatar URLs (lh3.googleusercontent.com) reject hotlinked requests
  // that carry a Referer header, which surfaces as a broken-image glitch.
  // Track load failures so we can fall back to the icon instead.
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);
  const showAvatar = !!avatar && !avatarFailed;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
        return;
      }
      if (e.key !== 'Tab') return;

      const container = drawerRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const container = drawerRef.current;
      if (!container) return;
      const first = container.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [open]);

  const navItems = [
    { href: '/', icon: Timer, label: t('nav_timer', 'Timer') },
    { href: '/schedule', icon: Calendar, label: t('nav_schedule', 'Schedule') },
    { href: '/insights', icon: BarChart3, label: t('nav_insights', 'Insights') },
  ];

  const stats = [
    { label: t('focus', 'Focus'), value: formatTime(studyData?.total_seconds || 0) },
    { label: t('sessions', 'Sessions'), value: String(studyData?.sessions ?? 0) },
    { label: t('streak', 'Streak'), value: `${studyData?.streak ?? 0}d` },
  ];

  const borderStyle = `1px solid ${cardBorder || 'rgba(128,128,128,0.15)'}`;

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={openDrawer}
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all hover:scale-110 shrink-0"
        style={btnStyle || { backgroundColor: `${inkFaint}`, border: `2px solid ${cardBorder || 'rgba(128,128,128,0.3)'}` }}
        aria-label={t('open_profile', 'Open profile')}
      >
        {showAvatar ? (
          <img src={avatar} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4" style={{ color: ink }} />
        )}
      </button>

      {/* Drawer — portaled to body to escape header stacking context */}
      {rendered && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm"
            style={{ opacity: shown ? 1 : 0, transition: 'opacity 300ms ease-out' }}
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('profile', 'Profile')}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="fixed top-0 h-full z-[10000] flex flex-col shadow-2xl"
            style={{
              [isRTL ? 'left' : 'right']: 0,
              width: 'min(360px, 85vw)',
              backgroundColor: card,
              borderLeft: isRTL ? borderStyle : 'none',
              borderRight: isRTL ? 'none' : borderStyle,
              transform: shown ? 'translateX(0)' : isRTL ? 'translateX(-105%)' : 'translateX(105%)',
              transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0.24, 1)',
              visibility: shown ? 'visible' : undefined,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: borderStyle }}>
              <span className="font-bold text-base" style={{ color: ink }}>{t('profile', 'Profile')}</span>
              <button
                onClick={closeDrawer}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: `${inkFaint}18` }}
                aria-label={t('close_menu', 'Close')}
              >
                <X className="w-4 h-4" style={{ color: ink }} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateX(0)' : isRTL ? 'translateX(-12px)' : 'translateX(12px)', transition: 'opacity 350ms ease-out 120ms, transform 350ms cubic-bezier(0.32, 0.72, 0.24, 1) 120ms' }}>
              {/* Profile */}
              <div className="flex items-center gap-3">
                {showAvatar ? (
                  <img src={avatar} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${inkFaint}22` }}>
                    <User className="w-6 h-6" style={{ color: ink }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate" style={{ color: ink }}>{name}</p>
                  {!isGuest && email && <p className="text-xs truncate" style={{ color: inkFaint }}>{email}</p>}
                </div>
              </div>

              {/* Study stats */}
              <div className="grid grid-cols-3 gap-2">
                {stats.map(s => (
                  <div key={s.label} className="text-center py-3 rounded-xl" style={{ backgroundColor: `${inkFaint}10` }}>
                    <div className="font-bold text-base" style={{ color: ink }}>{s.value}</div>
                    <div className="text-[11px] font-medium" style={{ color: inkFaint }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: inkFaint }}>{t('navigation', 'Navigation')}</p>
                <div className="space-y-1">
                  {navItems.map(item => {
                    const active = location === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeDrawer}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{
                          backgroundColor: active ? `${inkFaint}15` : 'transparent',
                          color: active ? ink : inkFaint,
                        }}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Settings */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: inkFaint }}>{t('settings', 'Settings')}</p>
                <div className="space-y-1">
                  <button
                    onClick={toggleDark}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{ color: inkFaint }}
                  >
                    {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                    {isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')}
                  </button>
                  <button
                    onClick={cycleLang}
                    aria-label={t('change_language', 'Change language')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{ color: inkFaint }}
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    {lang === 'en' ? 'English' : lang === 'badini' ? 'Badini' : lang === 'sorani' ? 'سۆرانی' : 'العربية'}
                  </button>
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{ color: inkFaint }}
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{t('export_data', 'Export data')}</span>
                    <span className="text-[11px] font-normal" style={{ color: `${inkFaint}99` }}>{t('export_data_hint', 'Backup as JSON')}</span>
                  </button>
                </div>
              </div>

              {/* Legal */}
              <div className="flex items-center gap-4 text-xs" style={{ color: inkFaint }}>
                <Link href="/privacy" onClick={closeDrawer} className="hover:underline">{t('nav_privacy', 'Privacy')}</Link>
                <Link href="/terms" onClick={closeDrawer} className="hover:underline">{t('nav_terms', 'Terms')}</Link>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 shrink-0" style={{ borderTop: borderStyle }}>
              <button
                onClick={() => { signOut(); closeDrawer(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-red-500/10 hover:text-red-500"
                style={{ color: inkFaint }}
              >
                <LogOut className="w-4 h-4" />
                {t('sign_out', 'Sign Out')}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
