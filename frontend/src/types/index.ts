export type Language = 'badini' | 'en' | 'ar' | 'sorani';

export const VALID_LANGS: Language[] = ['en', 'ar', 'badini', 'sorani'];

export interface SessionRecord {
  id: string;
  started_at: string;
  day: string;
  subject: string;
  planned_minutes: number;
  focus_seconds: number;
  completed: boolean;
  quiz_score?: number;
  quiz_correct?: number;
  quiz_total?: number;
}

export interface StudyData {
  total_seconds: number;
  sessions: number;
  last_subject: string;
  streak: number;
  last_study_date: string | null;
  daily_seconds: number;
  daily_goal_seconds: number;
  xp_points: number;
  xp_level: number;
  student_name: string;
  session_log: SessionRecord[];
}

export interface Task {
  id: string;
  start: string;
  end: string;
  task: string;
  done: boolean;
  type?: 'study' | 'commitment' | 'break';
}

export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type ScheduleData = Record<DayName, Task[]>;

export interface UserPrefs {
  lang: Language;
  dark_mode: boolean;
}