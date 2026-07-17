export type Language = 'badini' | 'en' | 'ar';

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
}

export interface Task {
  id: string;
  start: string;
  end: string;
  task: string;
  done: boolean;
}

export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type ScheduleData = Record<DayName, Task[]>;

export interface UserPrefs {
  lang: Language;
  dark_mode: boolean;
}