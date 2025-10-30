import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { initDemoUsers } from "./init-demo-users.tsx";
import { syncOAuthUser } from "./sync-oauth-user.tsx";

const app = new Hono();

// Initialize demo users on startup
initDemoUsers();

// Initialize Supabase clients
const getServiceClient = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const getAnonClient = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-9dc263ad/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ENDPOINTS ====================

// Sign up endpoint
app.post("/make-server-9dc263ad/auth/signup", async (c) => {
  try {
    const { email, password, firstName, lastName, organization } = await c.req.json();

    if (!email || !password || !firstName || !lastName) {
      return c.json({ error: "Missing required fields: email, password, firstName, lastName" }, 400);
    }

    const supabase = getServiceClient();

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        organization: organization || '',
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (authError) {
      console.error('Signup error during user creation:', authError);
      return c.json({ error: `Failed to create user: ${authError.message}` }, 400);
    }

    // Store user profile in KV store
    const userProfile = {
      id: authData.user.id,
      email,
      firstName,
      lastName,
      organization: organization || '',
      role: 'user', // Default role
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    await kv.set(`user:${authData.user.id}`, userProfile);

    return c.json({ 
      success: true, 
      userId: authData.user.id,
      message: 'Account created successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Unexpected error during signup:', error);
    return c.json({ error: `Server error during signup: ${error}` }, 500);
  }
});

// Sign in endpoint (returns access token for frontend)
app.post("/make-server-9dc263ad/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = getAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error during authentication:', error);
      return c.json({ error: `Authentication failed: ${error.message}` }, 401);
    }

    // Update last login time
    const userId = data.user.id;
    const userProfile = await kv.get(`user:${userId}`);
    if (userProfile) {
      userProfile.lastLogin = new Date().toISOString();
      await kv.set(`user:${userId}`, userProfile);
    }

    return c.json({ 
      success: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...data.user.user_metadata,
      }
    });
  } catch (error) {
    console.error('Unexpected error during sign in:', error);
    return c.json({ error: `Server error during sign in: ${error}` }, 500);
  }
});

// Get current user profile (protected endpoint)
app.get("/make-server-9dc263ad/auth/me", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error('Authorization error while fetching user profile:', error);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get full profile from KV store
    let userProfile = await kv.get(`user:${user.id}`);

    // If profile doesn't exist (e.g., OAuth user), create it
    if (!userProfile) {
      console.log('User profile not found, syncing OAuth user:', user.id);
      userProfile = await syncOAuthUser(user);
    }

    return c.json({ 
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('Unexpected error fetching user profile:', error);
    return c.json({ error: `Server error fetching profile: ${error}` }, 500);
  }
});

// Sign out endpoint
app.post("/make-server-9dc263ad/auth/signout", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401);
    }

    const supabase = getAnonClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return c.json({ error: `Sign out failed: ${error.message}` }, 400);
    }

    return c.json({ success: true, message: 'Signed out successfully' });
  } catch (error) {
    console.error('Unexpected error during sign out:', error);
    return c.json({ error: `Server error during sign out: ${error}` }, 500);
  }
});

// Request password reset
app.post("/make-server-9dc263ad/auth/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const supabase = getAnonClient();
    
    // Note: In production, this would send an email. For demo purposes, we'll just confirm the request.
    // Since email server is not configured, we'll use the admin API to generate a reset token
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      console.error('Password reset request error:', error);
      // Don't reveal whether email exists for security
      return c.json({ success: true, message: 'If an account exists with this email, you will receive password reset instructions.' });
    }

    return c.json({ 
      success: true, 
      message: 'Password reset email sent. Please check your inbox.' 
    });
  } catch (error) {
    console.error('Unexpected error during password reset request:', error);
    return c.json({ error: `Server error during password reset: ${error}` }, 500);
  }
});

// ==================== VERIFICATION ENDPOINTS ====================

// Create verification job
app.post("/make-server-9dc263ad/verifications", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('Authorization error while creating verification:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { filename, imageUrl, imageType } = await c.req.json();

    if (!filename || !imageUrl) {
      return c.json({ error: "Filename and imageUrl are required" }, 400);
    }

    // Create verification job
    const verificationId = crypto.randomUUID();
    const verification = {
      id: verificationId,
      userId: user.id,
      filename,
      imageUrl,
      imageType: imageType || 'upload',
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`verification:${verificationId}`, verification);
    
    // Add to user's verification list
    const userVerifications = await kv.get(`user_verifications:${user.id}`) || [];
    userVerifications.unshift(verificationId);
    await kv.set(`user_verifications:${user.id}`, userVerifications);

    // Simulate processing (in production, this would trigger the ML pipeline)
    setTimeout(async () => {
      try {
        const result = Math.random() > 0.5 ? 'real' : 'fake';
        const confidence = Math.floor(Math.random() * 30) + 70; // 70-100%
        
        verification.status = 'completed';
        verification.result = result;
        verification.confidence = confidence;
        verification.completedAt = new Date().toISOString();
        verification.updatedAt = new Date().toISOString();
        
        await kv.set(`verification:${verificationId}`, verification);
      } catch (err) {
        console.error('Error processing verification:', err);
      }
    }, 3000);

    return c.json({ 
      success: true,
      verificationId,
      message: 'Verification job created successfully'
    });
  } catch (error) {
    console.error('Unexpected error creating verification:', error);
    return c.json({ error: `Server error creating verification: ${error}` }, 500);
  }
});

// Get user's verifications (protected)
app.get("/make-server-9dc263ad/verifications", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('Authorization error while fetching verifications:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const verificationIds = await kv.get(`user_verifications:${user.id}`) || [];
    const verifications = await Promise.all(
      verificationIds.map(async (id: string) => await kv.get(`verification:${id}`))
    );

    return c.json({ 
      success: true,
      verifications: verifications.filter(v => v !== null)
    });
  } catch (error) {
    console.error('Unexpected error fetching verifications:', error);
    return c.json({ error: `Server error fetching verifications: ${error}` }, 500);
  }
});

// Get specific verification (protected)
app.get("/make-server-9dc263ad/verifications/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('Authorization error while fetching verification:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const verificationId = c.req.param('id');
    const verification = await kv.get(`verification:${verificationId}`);

    if (!verification) {
      return c.json({ error: 'Verification not found' }, 404);
    }

    // Check ownership
    if (verification.userId !== user.id) {
      return c.json({ error: 'Forbidden: You do not have access to this verification' }, 403);
    }

    return c.json({ 
      success: true,
      verification
    });
  } catch (error) {
    console.error('Unexpected error fetching verification:', error);
    return c.json({ error: `Server error fetching verification: ${error}` }, 500);
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Middleware to check admin role
async function requireAdmin(c: any, next: any) {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('Authorization error in admin middleware:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);

    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }

    c.set('user', userProfile);
    await next();
  } catch (error) {
    console.error('Unexpected error in admin middleware:', error);
    return c.json({ error: `Server error checking admin access: ${error}` }, 500);
  }
}

// Get all users (admin only)
app.get("/make-server-9dc263ad/admin/users", requireAdmin, async (c) => {
  try {
    const userKeys = await kv.getByPrefix('user:');
    const users = userKeys.map(item => item.value);

    return c.json({ 
      success: true,
      users
    });
  } catch (error) {
    console.error('Unexpected error fetching users:', error);
    return c.json({ error: `Server error fetching users: ${error}` }, 500);
  }
});

// Update user role (admin only)
app.put("/make-server-9dc263ad/admin/users/:userId/role", requireAdmin, async (c) => {
  try {
    const userId = c.req.param('userId');
    const { role } = await c.req.json();

    if (!['user', 'admin'].includes(role)) {
      return c.json({ error: 'Invalid role. Must be "user" or "admin"' }, 400);
    }

    const userProfile = await kv.get(`user:${userId}`);

    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    userProfile.role = role;
    userProfile.updatedAt = new Date().toISOString();
    await kv.set(`user:${userId}`, userProfile);

    return c.json({ 
      success: true,
      message: `User role updated to ${role}`,
      user: userProfile
    });
  } catch (error) {
    console.error('Unexpected error updating user role:', error);
    return c.json({ error: `Server error updating user role: ${error}` }, 500);
  }
});

// Get all verifications (admin only)
app.get("/make-server-9dc263ad/admin/verifications", requireAdmin, async (c) => {
  try {
    const verificationKeys = await kv.getByPrefix('verification:');
    const verifications = verificationKeys.map(item => item.value);

    return c.json({ 
      success: true,
      verifications
    });
  } catch (error) {
    console.error('Unexpected error fetching all verifications:', error);
    return c.json({ error: `Server error fetching verifications: ${error}` }, 500);
  }
});

// Get dataset management info (admin only)
app.get("/make-server-9dc263ad/admin/datasets", requireAdmin, async (c) => {
  try {
    const datasets = await kv.get('admin:datasets') || [];

    return c.json({ 
      success: true,
      datasets
    });
  } catch (error) {
    console.error('Unexpected error fetching datasets:', error);
    return c.json({ error: `Server error fetching datasets: ${error}` }, 500);
  }
});

// Add dataset (admin only)
app.post("/make-server-9dc263ad/admin/datasets", requireAdmin, async (c) => {
  try {
    const { name, description, imageCount, source } = await c.req.json();

    if (!name || !imageCount) {
      return c.json({ error: 'Name and imageCount are required' }, 400);
    }

    const datasets = await kv.get('admin:datasets') || [];
    const dataset = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      imageCount,
      source: source || 'manual',
      createdAt: new Date().toISOString(),
    };

    datasets.push(dataset);
    await kv.set('admin:datasets', datasets);

    return c.json({ 
      success: true,
      dataset
    });
  } catch (error) {
    console.error('Unexpected error adding dataset:', error);
    return c.json({ error: `Server error adding dataset: ${error}` }, 500);
  }
});

// Get system statistics (admin only)
app.get("/make-server-9dc263ad/admin/stats", requireAdmin, async (c) => {
  try {
    const userKeys = await kv.getByPrefix('user:');
    const verificationKeys = await kv.getByPrefix('verification:');
    
    const users = userKeys.map(item => item.value);
    const verifications = verificationKeys.map(item => item.value);
    
    const totalUsers = users.length;
    const totalVerifications = verifications.length;
    const completedVerifications = verifications.filter(v => v.status === 'completed').length;
    const fakeDetected = verifications.filter(v => v.result === 'fake').length;
    const realDetected = verifications.filter(v => v.result === 'real').length;

    return c.json({ 
      success: true,
      stats: {
        totalUsers,
        totalVerifications,
        completedVerifications,
        fakeDetected,
        realDetected,
        accuracy: completedVerifications > 0 ? Math.round((completedVerifications / totalVerifications) * 100) : 0,
      }
    });
  } catch (error) {
    console.error('Unexpected error fetching stats:', error);
    return c.json({ error: `Server error fetching stats: ${error}` }, 500);
  }
});

Deno.serve(app.fetch);
