import * as kv from "./kv_store.tsx";

// Sync OAuth user to our KV store
export async function syncOAuthUser(supabaseUser: any) {
  try {
    const userId = supabaseUser.id;
    
    // Check if user already exists
    const existingUser = await kv.get(`user:${userId}`);
    if (existingUser) {
      // Update last login
      existingUser.lastLogin = new Date().toISOString();
      await kv.set(`user:${userId}`, existingUser);
      return existingUser;
    }

    // Create new user profile for OAuth user
    const fullName = supabaseUser.user_metadata?.full_name || '';
    const nameParts = fullName.split(' ');
    
    const userProfile = {
      id: userId,
      email: supabaseUser.email || '',
      firstName: supabaseUser.user_metadata?.first_name || nameParts[0] || 'User',
      lastName: supabaseUser.user_metadata?.last_name || nameParts.slice(1).join(' ') || '',
      organization: supabaseUser.user_metadata?.organization || '',
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      authProvider: supabaseUser.app_metadata?.provider || 'google',
    };

    await kv.set(`user:${userId}`, userProfile);
    console.log('Synced OAuth user to KV store:', userId);
    
    return userProfile;
  } catch (error) {
    console.error('Error syncing OAuth user:', error);
    throw error;
  }
}
