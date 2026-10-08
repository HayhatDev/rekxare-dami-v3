import { ReactNode, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from './LoginPage';
import LanguageOnboarding, { hasCompletedOnboarding } from './LanguageOnboarding';
import PasswordRecovery from './PasswordRecovery';
import { Loader2 } from 'lucide-react';

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Paths a signed-out visitor may reach without an account.
 *
 * `/` serves the public landing page, `/quiz` is the try-before-signup teaser
 * (also listed in sitemap.xml), and `/privacy` + `/terms` must stay readable
 * - they are linked from the landing page and expected to be indexable.
 * Everything else is behind the auth wall.
 */
const PUBLIC_PATHS = new Set(['/', '/privacy', '/terms', '/quiz']);

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading, isGuest, inPasswordRecovery } = useAuth();
  const [location] = useLocation();
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
    if (PUBLIC_PATHS.has(location)) return <>{children}</>;
    // `key` remounts the form when the target route changes, so landing on
    // /signup opens the create-account tab instead of inheriting 'signin'.
    return <LoginPage key={location} initialMode={location === '/signup' ? 'signup' : 'signin'} />;
  }

  if (!isGuest && user && !onboardingDone) {
    return <LanguageOnboarding onComplete={() => setOnboardingDone(true)} />;
  }

  return <>{children}</>;
}
