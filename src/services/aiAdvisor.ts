import { api, getAuthHeaders } from './supabase';
import { buildLocalDashboard } from './localInsights';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

export interface SubjectBreakdown {
  subject: string;
  hours: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DashboardData {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  weekly_trend: 'improving' | 'stable' | 'declining';
  subject_breakdown: SubjectBreakdown[];
  recommendations: string[];
  score: number;
  isLocal?: boolean;
}

export interface ScheduleGenerationResult {
  schedule: Record<string, Array<{ start: string; end: string; task: string }>>;
  explanation: string;
}

export interface SchedulePreferences {
  goal: string;
  preferred_time?: string;
  rest_days?: string[];
  subject_preferences?: string[];
  existing_tasks?: string;
  lang?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
  note?: string;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options.headers,
    },
  });
  return res;
}

export async function fetchDashboardAnalysis(lang: string = 'en'): Promise<DashboardData> {
  const studyData = await api.getStudyData();
  if (!(await getAuthHeaders()).Authorization) {
    const schedule = await api.getSchedule();
    return buildLocalDashboard(studyData, schedule);
  }
  const res = await authFetch(`${API_URL}/api/ai/dashboard`, {
    method: 'POST',
    body: JSON.stringify({ lang, data: studyData }),
  });
  if (res.status === 401) throw new Error('AUTH_REQUIRED');
  if (!res.ok) throw new Error('Failed to fetch dashboard analysis');
  return res.json();
}

export async function generateAISchedule(prefs: SchedulePreferences): Promise<ScheduleGenerationResult> {
  const res = await authFetch(`${API_URL}/api/ai/generate`, {
    method: 'POST',
    body: JSON.stringify(prefs),
  });
  if (res.status === 401) throw new Error('AUTH_REQUIRED');
  if (!res.ok) throw new Error('Failed to generate schedule');
  return res.json();
}

export async function generateQuiz(opts: {
  text: string;
  subject?: string;
  questionCount?: number;
  lang?: string;
}): Promise<QuizResult> {
  const res = await authFetch(`${API_URL}/api/ai/quiz`, {
    method: 'POST',
    body: JSON.stringify({
      text: opts.text,
      subject: opts.subject ?? '',
      question_count: Math.min(10, Math.max(2, opts.questionCount ?? 5)),
      lang: opts.lang ?? 'en',
    }),
  });
  if (res.status === 401) throw new Error('AUTH_REQUIRED');
  if (res.status === 400) throw new Error('NOT_ENOUGH_TEXT');
  if (!res.ok) {
    if (res.status === 422) {
      const bodyText = await res.json().catch(() => null);
      throw new Error((bodyText?.detail as string) || 'NO_USABLE_TEXT');
    }
    throw new Error('Failed to generate quiz');
  }
  return res.json();
}
