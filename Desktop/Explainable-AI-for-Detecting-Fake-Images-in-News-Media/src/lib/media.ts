const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '');

export const buildMediaUrl = (input?: string | null) => {
  if (!input) return '';
  if (/^(https?:)?\/\//i.test(input) || input.startsWith('data:')) {
    return input;
  }

  if (!API_BASE_URL) {
    return input;
  }

  const normalized = input.startsWith('/') ? input : `/${input}`;
  return `${API_BASE_URL}${normalized}`;
};
