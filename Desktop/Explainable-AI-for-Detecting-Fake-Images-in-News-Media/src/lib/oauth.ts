const OAUTH_REMEMBER_KEY = 'newssight-oauth-remember';

export const storeOAuthPreference = (remember: boolean) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    OAUTH_REMEMBER_KEY,
    JSON.stringify({ rememberMe: remember })
  );
};

export const consumeOAuthPreference = () => {
  if (typeof window === 'undefined') return true;
  const raw = window.sessionStorage.getItem(OAUTH_REMEMBER_KEY);
  window.sessionStorage.removeItem(OAUTH_REMEMBER_KEY);
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.rememberMe === 'boolean' ? parsed.rememberMe : true;
  } catch {
    return true;
  }
};
