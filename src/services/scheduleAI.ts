import { useMutation } from '@tanstack/react-query';

/**
 * Local replacement for the former `@workspace/api-client-react`
 * `useGenerateScheduleSuggestion` hook. It generates a balanced weekly study
 * plan from a goal, a list of subjects, and a daily hour budget — entirely on
 * the client so the app runs standalone without the workspace API service.
 */

export interface GenerateScheduleInput {
  goal: string;
  subjects: string[];
  hoursPerDay: number;
}

export interface SuggestedTask {
  start: string;
  end: string;
  task: string;
}

export interface SuggestedDay {
  day: string;
  tasks: SuggestedTask[];
}

export interface GenerateScheduleResult {
  days: SuggestedDay[];
}

const WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function toClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildSchedule(input: GenerateScheduleInput): GenerateScheduleResult {
  const subjects = input.subjects.length > 0 ? input.subjects : ['Study'];
  const hoursPerDay = Math.max(1, Math.min(12, input.hoursPerDay || 4));

  // Study days: Monday–Saturday, keep Sunday lighter for review/rest.
  const studyDays = WEEK.slice(0, 6);

  // Each focus block is 50 min work + 10 min break.
  const blocksPerDay = Math.max(1, Math.round((hoursPerDay * 60) / 60));
  const startOfDay = 9 * 60; // 09:00

  let subjectCursor = 0;

  const days: SuggestedDay[] = WEEK.map((day) => {
    if (!studyDays.includes(day)) {
      // Sunday: single review session tied to the goal.
      return {
        day,
        tasks: [
          {
            start: '10:00',
            end: '11:00',
            task: `Weekly review — ${input.goal || 'progress check'}`,
          },
        ],
      };
    }

    const tasks: SuggestedTask[] = [];
    let cursor = startOfDay;
    for (let b = 0; b < blocksPerDay; b++) {
      const subject = subjects[subjectCursor % subjects.length];
      subjectCursor++;
      const start = toClock(cursor);
      const end = toClock(cursor + 50);
      tasks.push({ start, end, task: subject });
      cursor += 60; // 50 min focus + 10 min break
    }
    return { day, tasks };
  });

  return { days };
}

export function useGenerateScheduleSuggestion() {
  return useMutation<GenerateScheduleResult, Error, { data: GenerateScheduleInput }>({
    mutationFn: async ({ data }) => {
      // Simulate a brief "thinking" delay for realistic UX.
      await new Promise((r) => setTimeout(r, 700));
      return buildSchedule(data);
    },
  });
}
