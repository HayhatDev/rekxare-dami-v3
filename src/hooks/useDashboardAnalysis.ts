import { useAIFetch } from './useAIFetch';
import { fetchDashboardAnalysis, DashboardData } from '../services/aiAdvisor';

export const useDashboardAnalysis = () =>
  useAIFetch<DashboardData>({
    queryKey: 'dashboardAnalysis',
    fetcher: fetchDashboardAnalysis,
  });
