import type { User } from '@/store/auth';

export const getUserDisplayName = (user?: User | null) => {
  if (!user) {
    return '';
  }

  const structuredName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

  return (
    user.name?.trim() ||
    user.full_name?.trim() ||
    (structuredName.length > 0 ? structuredName : undefined) ||
    user.email ||
    ''
  );
};

export const getInitialNameParts = (user?: User | null) => {
  const firstName = user?.first_name?.trim() ?? '';
  const lastName = user?.last_name?.trim() ?? '';

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  const fallback = user?.name ?? user?.full_name ?? '';
  if (!fallback.trim()) {
    return { firstName: '', lastName: '' };
  }

  const [first, ...rest] = fallback.trim().split(/\s+/);
  return {
    firstName: first ?? '',
    lastName: rest.join(' '),
  };
};
