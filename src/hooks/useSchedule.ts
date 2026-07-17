import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/supabase';
import { ScheduleData } from '../types';

export const useSchedule = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['schedule'],
    queryFn: api.getSchedule
  });

  const mutation = useMutation({
    mutationFn: (newData: ScheduleData) => api.updateSchedule(newData),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['schedule'], variables);
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    updateSchedule: mutation.mutate,
    isUpdating: mutation.isPending
  };
};