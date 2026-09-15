import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell } from 'lucide-react';
import { STATUS_COLORS } from '../../utils/constants';

interface NotificationBellProps {
  colors: {
    card: string;
    cardBorder: string;
    ink: string;
    inkSoft: string;
    inkFaint: string;
    accent: string;
  };
  variant?: 'clay' | 'clarity' | 'mountain' | 'forest' | 'ocean' | 'night';
}

export default function NotificationBell({ colors, variant = 'clay' }: NotificationBellProps) {
  const { t } = useTranslation();
  const { requestPermission, permissionStatus } = useNotifications();

  if (permissionStatus === 'unavailable') return null;

  const granted = permissionStatus === 'granted';
  const denied = permissionStatus === 'denied';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={requestPermission}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all hover:scale-105"
        style={{
          backgroundColor: granted ? `${colors.accent}15` : denied ? `${STATUS_COLORS.danger}15` : `${colors.accent}10`,
          color: granted ? colors.accent : denied ? STATUS_COLORS.danger : colors.inkFaint,
          border: `1px solid ${granted ? `${colors.accent}30` : denied ? `${STATUS_COLORS.danger}30` : colors.cardBorder}`,
        }}
        title={t('notifications_title', 'Schedule Notifications')}
      >
        <Bell size={14} />
        {granted ? t('notifications_on', 'Alerts On') : denied ? t('notifications_blocked', 'Blocked') : t('enable_notifications', 'Enable Alerts')}
      </button>
    </div>
  );
}
