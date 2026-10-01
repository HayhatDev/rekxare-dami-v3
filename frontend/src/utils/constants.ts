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
  '#22C55E', // Biology (Green)
  '#3B82F6', // Kurdish (Blue)
  '#EF4444', // Arabic (Red)
  '#F59E0B', // English (Amber)
  '#14B8A6', // Turkish (Teal)
  '#A855F7', // History (Purple)
  '#06B6D4', // Geography (Cyan)
  '#9CA3AF', // Philosophy (Slate)
  '#8B5CF6', // Religion (Violet)
  '#2563EB', // Computer (Blue)
  '#84CC16', // Economics (Lime)
  '#FB7185', // Programming (Rose)
  '#C084FC', // Art (Lavender)
  '#38BDF8', // Music (Sky)
  '#10B981', // Sports (Emerald)
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