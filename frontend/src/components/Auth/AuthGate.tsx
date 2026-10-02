import { ReactNode, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from './LoginPage';
import LanguageOnboarding, { hasCompletedOnboarding } from './LanguageOnboarding';
import PasswordRecovery from './PasswordRecovery';
import { Loader2 } from 'lucide-react';

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading, isGuest, inPasswordRecovery } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(() => hasCompletedOnboarding());

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Checked before the signed-out branch: the recovery link grants a session
  // without a password, so gating it behind LoginPage would leave the student
  // holding a valid session with no form to set the new password on.
  if (inPasswordRecovery) {
    return <PasswordRecovery />;
  }

  if (!user && !isGuest) {
    return <LoginPage />;
  }

  if (!isGuest && user && !onboardingDone) {
    return <LanguageOnboarding onComplete={() => setOnboardingDone(true)} />;
  }

  return <>{children}</>;
}
