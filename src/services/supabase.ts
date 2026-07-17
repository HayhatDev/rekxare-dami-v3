import { createClient } from '@supabase/supabase-js';
import { StudyData, ScheduleData, UserPrefs } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseKey !== '';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const getUserKey = () => {
  let key = localStorage.getItem('rekxare_user_key');
  if (!key) {
    key = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('rekxare_user_key', key);
  }
  return key;
};

const DEFAULT_STUDY_DATA: StudyData = {
  total_seconds: 0,
  sessions: 0,
  last_subject: '—',
  streak: 0,
  last_study_date: null,
  daily_seconds: 0,
  daily_goal_seconds: 7200,
  xp_points: 0,
  xp_level: 1,
  student_name: ''
};

const DEFAULT_SCHEDULE: ScheduleData = {
  Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

// Fallbacks using localStorage
const localFallback = {
  getStudyData: async (): Promise<StudyData> => {
    const data = localStorage.getItem('rekxare_study_data');
    return data ? { ...DEFAULT_STUDY_DATA, ...JSON.parse(data) } : DEFAULT_STUDY_DATA;
  },
  setStudyData: async (data: StudyData): Promise<void> => {
    localStorage.setItem('rekxare_study_data', JSON.stringify(data));
  },
  getSchedule: async (): Promise<ScheduleData> => {
    const data = localStorage.getItem('rekxare_schedule');
    return data ? JSON.parse(data) : DEFAULT_SCHEDULE;
  },
  setSchedule: async (data: ScheduleData): Promise<void> => {
    localStorage.setItem('rekxare_schedule', JSON.stringify(data));
  },
  getUserPrefs: async (): Promise<UserPrefs> => {
    const data = localStorage.getItem('rekxare_user_prefs');
    return data ? JSON.parse(data) : { lang: 'en', dark_mode: false };
  },
  setUserPrefs: async (prefs: UserPrefs): Promise<void> => {
    localStorage.setItem('rekxare_user_prefs', JSON.stringify(prefs));
  }
};

export const api = {
  async getStudyData(): Promise<StudyData> {
    if (!supabase) return localFallback.getStudyData();
    const { data, error } = await supabase.from('study_data').select('data').eq('user_key', getUserKey()).maybeSingle();
    if (error || !data) return localFallback.getStudyData();
    return { ...DEFAULT_STUDY_DATA, ...data.data };
  },
  async updateStudyData(studyData: StudyData): Promise<void> {
    await localFallback.setStudyData(studyData);
    if (!supabase) return;
    await supabase.from('study_data').upsert({ user_key: getUserKey(), data: studyData, updated_at: new Date().toISOString() });
  },
  async getSchedule(): Promise<ScheduleData> {
    if (!supabase) return localFallback.getSchedule();
    const { data, error } = await supabase.from('schedules').select('schedule').eq('user_key', getUserKey()).maybeSingle();
    if (error || !data) return localFallback.getSchedule();
    return data.schedule || DEFAULT_SCHEDULE;
  },
  async updateSchedule(schedule: ScheduleData): Promise<void> {
    await localFallback.setSchedule(schedule);
    if (!supabase) return;
    await supabase.from('schedules').upsert({ user_key: getUserKey(), schedule, updated_at: new Date().toISOString() });
  },
  async getUserPrefs(): Promise<UserPrefs> {
    if (!supabase) return localFallback.getUserPrefs();
    const { data, error } = await supabase.from('user_prefs').select('lang, dark_mode').eq('user_key', getUserKey()).maybeSingle();
    if (error || !data) return localFallback.getUserPrefs();
    return { lang: data.lang, dark_mode: data.dark_mode };
  },
  async updateUserPrefs(prefs: UserPrefs): Promise<void> {
    await localFallback.setUserPrefs(prefs);
    if (!supabase) return;
    await supabase.from('user_prefs').upsert({ user_key: getUserKey(), lang: prefs.lang, dark_mode: prefs.dark_mode, updated_at: new Date().toISOString() });
  }
};