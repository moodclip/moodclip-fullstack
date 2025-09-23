import { useEffect } from 'react';
import { claimPendingUploads, hasPendingClaimTokens } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

const attemptClaim = async () => {
  if (!hasPendingClaimTokens()) return;
  const authed = await isLoggedIn().catch(() => false);
  if (!authed) return;
  await claimPendingUploads().catch((error) => {
    console.warn('[moodclip] claimPendingUploads failed', error);
  });
};

export const useClaimTokensOnAuth = () => {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await attemptClaim();
    };

    run();

    const onFocus = () => {
      void run();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void run();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
};
