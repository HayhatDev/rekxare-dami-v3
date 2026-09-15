import { ReactNode, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from './LoginPage';
import LanguageOnboarding, { hasCompletedOnboarding } from './LanguageOnboarding';
import { Loader2 } from 'lucide-react';

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading, isGuest } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(() => hasCompletedOnboarding());

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LoginPage />;
  }

  if (!isGuest && user && !onboardingDone) {
    return <LanguageOnboarding onComplete={() => setOnboardingDone(true)} />;
  }

  return <>{children}</>;
}
