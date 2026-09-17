import { useMutation } from '@tanstack/react-query';
import { generateAISchedule, SchedulePreferences } from './aiAdvisor';
import i18next from 'i18next';

export interface GenerateScheduleInput {
  goal: string;
  subjects: string[];
  hoursPerDay: number;
  preferred_time?: string;
  rest_days?: string[];
  lang?: string;
}

export interface SuggestedTask {
  start: string;
  end: string;
  task: string;
  type?: 'study' | 'commitment' | 'break';
}

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

function buildLocalSchedule(input: GenerateScheduleInput): { schedule: Record<string, SuggestedTask[]>; explanation: string } {
  const WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const subjects = input.subjects.length > 0 ? input.subjects : [i18next.t('ai_offline_subject')];
  const hoursPerDay = Math.max(1, Math.min(12, input.hoursPerDay || 4));
  const studyDays = WEEK.filter(d => !(input.rest_days || []).includes(d));
  const blocksPerDay = Math.max(1, Math.round(hoursPerDay));
  const startOfDay = 9 * 60;

  let subjectCursor = 0;
  const schedule: Record<string, SuggestedTask[]> = {};

  WEEK.forEach((day) => {
    if (!studyDays.includes(day)) {
      schedule[day] = [{ start: '10:00', end: '11:00', task: i18next.t('ai_offline_fallback', { task: input.goal || 'progress check' }) }];
      return;
    }
    const tasks: SuggestedTask[] = [];
    let cursor = startOfDay;
    for (let b = 0; b < blocksPerDay; b++) {
      const subject = subjects[subjectCursor % subjects.length];
      subjectCursor++;
      const h1 = Math.floor(cursor / 60) % 24;
      const m1 = cursor % 60;
      const h2 = Math.floor((cursor + 50) / 60) % 24;
      const m2 = (cursor + 50) % 60;
      tasks.push({
        start: `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}`,
        end: `${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`,
        task: subject,
      });
      cursor += 60;
    }
    schedule[day] = tasks;
  });

  return { schedule, explanation: '' };
}

export interface ScheduleMutationResult {
  schedule: Record<string, SuggestedTask[]>;
  explanation: string;
  usedAI: boolean;
  authError: boolean;
  apiError?: boolean;
}

export function useGenerateScheduleSuggestion() {
  return useMutation<
    ScheduleMutationResult,
    Error,
    { data: GenerateScheduleInput; preferences?: Partial<SchedulePreferences> }
  >({
    mutationFn: async ({ data, preferences }) => {
      const prefs: SchedulePreferences = {
        goal: data.goal,
        preferred_time: preferences?.preferred_time || 'any',
        rest_days: preferences?.rest_days || data.rest_days || [],
        subject_preferences: preferences?.subject_preferences || data.subjects,
        existing_tasks: preferences?.existing_tasks || '',
        lang: preferences?.lang || data.lang || 'en',
      };

      try {
        const result = await generateAISchedule(prefs);
        return { schedule: result.schedule, explanation: result.explanation, usedAI: true, authError: false };
      } catch (e: any) {
        if (import.meta.env.DEV) console.error('[AI] Schedule generation failed:', e?.message || e);
        if (e?.message === 'AUTH_REQUIRED') {
          return { ...buildLocalSchedule(data), usedAI: false, authError: true };
        }
        if (e?.message?.includes('Failed to generate schedule')) {
          return { ...buildLocalSchedule(data), usedAI: false, authError: false, apiError: true };
        }
        return { ...buildLocalSchedule(data), usedAI: false, authError: false };
      }
    },
  });
}
