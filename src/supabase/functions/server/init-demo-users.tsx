import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

// Initialize demo users
export async function initDemoUsers() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Check if demo users already exist
    const demoUser = await kv.get('demo_user_initialized');
    if (demoUser) {
      console.log('Demo users already initialized');
      return;
    }

    // Create demo journalist user
    const { data: journalistData, error: journalistError } = await supabase.auth.admin.createUser({
      email: 'demo@newssight.com',
      password: 'demo123',
      user_metadata: {
        first_name: 'Demo',
        last_name: 'Journalist',
        organization: 'NewsSight Demo',
      },
      email_confirm: true,
    });

    if (!journalistError && journalistData.user) {
      const userProfile = {
        id: journalistData.user.id,
        email: 'demo@newssight.com',
        firstName: 'Demo',
        lastName: 'Journalist',
        organization: 'NewsSight Demo',
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      await kv.set(`user:${journalistData.user.id}`, userProfile);
      console.log('Demo journalist user created:', journalistData.user.id);
    }

    // Create demo admin user
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@newssight.com',
      password: 'admin123',
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        organization: 'NewsSight',
      },
      email_confirm: true,
    });

    if (!adminError && adminData.user) {
      const adminProfile = {
        id: adminData.user.id,
        email: 'admin@newssight.com',
        firstName: 'Admin',
        lastName: 'User',
        organization: 'NewsSight',
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      await kv.set(`user:${adminData.user.id}`, adminProfile);
      console.log('Demo admin user created:', adminData.user.id);
    }

    // Mark as initialized
    await kv.set('demo_user_initialized', true);
    console.log('Demo users initialization complete');
  } catch (error) {
    console.error('Error initializing demo users:', error);
  }
}
