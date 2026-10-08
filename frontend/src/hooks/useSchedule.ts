import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api, classifyScheduleSaveFailure } from '../services/supabase';
import { ScheduleData } from '../types';

export const useSchedule = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ['schedule'],
    queryFn: api.getSchedule
  });

  // `api.updateSchedule` reports which half of the save failed, because the two
  // cases need opposite handling:
  //
  // - `local`: the on-device write failed, so the new schedule is stored
  //   nowhere. The optimistic value is rolled back - leaving it on screen would
  //   show a week that does not exist, and re-saving would be a silent no-op.
  // - `cloud`: the on-device write succeeded and only the account copy failed.
  //   The optimistic value is kept, because reverting would discard a save that
  //   really did land; the student is told the account copy is behind instead of
  //   discovering it on the next reload, when the server's older schedule wins.
  const mutation = useMutation({
    mutationFn: (newData: ScheduleData) => api.updateSchedule(newData),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['schedule'] });
      const previous = queryClient.getQueryData<ScheduleData>(['schedule']);
      queryClient.setQueryData(['schedule'], newData);
      return { previous };
    },
    onError: (error, _newData, context) => {
      if (import.meta.env.DEV) console.error('[useSchedule] Failed to save schedule:', error);
      if (classifyScheduleSaveFailure(error) === 'nowhere') {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(['schedule'], context.previous);
        }
        toast.error(t('schedule_save_failed_title', 'Schedule not saved'), {
          description: t(
            'schedule_save_failed_desc',
            'This device could not store your schedule, so the change was not saved. Free up some storage and try again.'
          ),
          duration: 7000,
        });
        return;
      }
      toast.error(t('schedule_save_error_title', 'Saved on this device only'), {
        description: t(
          'schedule_save_error_desc',
          'Your schedule could not be synced to your account. It is safe here, but may not appear on your other devices.'
        ),
        duration: 7000,
      });
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    updateSchedule: mutation.mutate,
    isUpdating: mutation.isPending
  };
};