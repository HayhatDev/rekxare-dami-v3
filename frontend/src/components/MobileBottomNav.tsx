import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Timer, Calendar, BarChart3 } from 'lucide-react';

interface MobileNavProps {
  accent: string;
  card: string;
  cardBorder: string;
  inkFaint: string;
  bg: string;
}

const NAV_ITEMS = [
  { href: '/', icon: Timer, labelKey: 'nav_timer' },
  { href: '/schedule', icon: Calendar, labelKey: 'nav_schedule' },
  { href: '/insights', icon: BarChart3, labelKey: 'nav_insights' },
];

const LABEL_DEFAULTS: Record<string, string> = {
  nav_timer: 'Timer',
  nav_schedule: 'Schedule',
  nav_insights: 'Insights',
};

export default function MobileBottomNav({ accent, card, cardBorder, inkFaint, bg }: MobileNavProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((i) => i.href === location));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl"
      style={{ backgroundColor: `${bg}ee`, borderColor: cardBorder, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="relative flex items-center justify-around px-2 py-1.5">
        {/* Sliding active indicator */}
        <span
          aria-hidden="true"
          className="absolute top-1.5 bottom-1.5 rounded-xl pointer-events-none"
          style={{
            left: `${((activeIndex + 0.5) / NAV_ITEMS.length) * 100}%`,
            width: '64px',
            transform: 'translateX(-50%)',
            backgroundColor: `${accent}15`,
            transition: 'left 350ms cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
        />
        {NAV_ITEMS.map((item, i) => {
          const active = i === activeIndex;
          return (
            <Link key={item.href} href={item.href}
              aria-current={active ? 'page' : undefined}
              className="relative z-[1] flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-transform duration-150 active:scale-90"
              style={{ minWidth: '56px' }}>
              <item.icon
                className={`w-5 h-5 transition-all duration-300 ${active ? 'scale-110' : ''}`}
                style={{ color: active ? accent : inkFaint }}
              />
              <span
                className={`text-[11px] font-semibold transition-colors duration-200 ${active ? '' : 'opacity-80'}`}
                style={{ color: active ? accent : inkFaint }}>
                {t(item.labelKey, LABEL_DEFAULTS[item.labelKey])}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
