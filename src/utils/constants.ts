/** Canonical success / warning / danger colors. Matches SUBJECT_COLORS entries so status UI stays consistent across themes. */
export const STATUS_COLORS = {
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const;

export const SUBJECT_COLORS = [
  '#4F46E5', // Math (Indigo)
  '#7C3AED', // Physics (Purple)
  '#EC4899', // Chemistry (Pink)
  '#EF4444', // English (Red)
  '#22C55E', // Biology (Green)
  '#F59E0B', // History (Amber)
  '#06B6D4', // Geography (Cyan)
  '#3B82F6', // Computer (Blue)
  '#8B5CF6'  // Religion (Violet)
];

export const PRESET_MINUTES = [5, 15, 25, 45, 60];

export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
] as const;

/** Maps English day names to i18n keys for display labels */
export const DAY_I18N_KEYS: Record<string, string> = {
  Monday: 'day_mon',
  Tuesday: 'day_tue',
  Wednesday: 'day_wed',
  Thursday: 'day_thu',
  Friday: 'day_fri',
  Saturday: 'day_sat',
  Sunday: 'day_sun',
};

/** Short abbreviations for schedule rest-day pickers */
export const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;