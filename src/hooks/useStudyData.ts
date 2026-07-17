import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/supabase';
import { StudyData } from '../types';

export const useStudyData = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['studyData'],
    queryFn: api.getStudyData
  });

  const mutation = useMutation({
    mutationFn: (newData: Partial<StudyData>) => {
      const current = queryClient.getQueryData<StudyData>(['studyData']);
      if (!current) throw new Error('No data');
      return api.updateStudyData({ ...current, ...newData });
    },
    onSuccess: (_, newData) => {
      queryClient.setQueryData<StudyData>(['studyData'], (old) => {
        return old ? { ...old, ...newData } : old;
      });
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    updateData: mutation.mutate,
    isUpdating: mutation.isPending
  };
};