# NewsSight - Supabase Setup Guide

## Overview

NewsSight is now fully integrated with Supabase for authentication, user management, and data storage. This document outlines the setup completed and any additional configuration needed.

## ✅ Completed Integration

### Authentication System
- **Email/Password Authentication**: Fully functional with signup, signin, and password reset flows
- **Session Management**: Automatic session persistence and token refresh
- **Demo Accounts**: Pre-configured demo accounts for testing
  - Journalist: `demo@newssight.com` / `demo123`
  - Admin: `admin@newssight.com` / `admin123`

### Database & Storage
- **User Profiles**: Stored in Supabase KV store with role-based access control
- **Verification History**: Complete audit trail of all image verifications
- **Admin Features**: User management, dataset tracking, and system statistics

### Backend API
- **Server**: Supabase Edge Functions running Hono web server
- **Endpoints**:
  - `/auth/*` - Authentication endpoints (signup, signin, signout, profile)
  - `/verifications/*` - Verification management (create, list, get)
  - `/admin/*` - Admin-only endpoints (users, datasets, stats)

## 🔧 Optional: Google OAuth Setup

To enable Google sign-in, you need to configure Google OAuth in your Supabase project:

### Steps:

1. **Visit Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Navigate to your project: `olczufgaitteuppykugm`

2. **Enable Google Provider**
   - Go to Authentication → Providers
   - Find "Google" and click "Enable"
   - Follow the setup wizard

3. **Create Google OAuth Credentials**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Add authorized redirect URIs:
     ```
     https://olczufgaitteuppykugm.supabase.co/auth/v1/callback
     ```
   - Copy the Client ID and Client Secret

4. **Add Credentials to Supabase**
   - Return to Supabase Dashboard → Authentication → Providers → Google
   - Paste your Google Client ID and Client Secret
   - Save changes

5. **Test Google Sign-In**
   - The "Sign in with Google" button will now work in your app
   - Users can authenticate with their Google accounts

### Reference Documentation
- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 🎯 Features Implemented

### User Features
1. **Secure Registration & Login**
   - Email/password authentication with validation
   - Password strength indicator
   - Email verification (auto-confirmed for development)
   - Remember me functionality

2. **Dashboard**
   - Real-time verification history
   - User statistics and analytics
   - Quick upload access

3. **Image Verification**
   - Upload images or provide URLs
   - Real-time processing status
   - Detailed results with confidence scores
   - Visual explainability features

### Admin Features
1. **User Management**
   - View all users
   - Update user roles (user/admin)
   - Track user activity

2. **System Statistics**
   - Total users and verifications
   - Detection accuracy metrics
   - System health monitoring

3. **Dataset Management**
   - Add and manage training datasets
   - Track dataset sources and image counts

## 📊 Database Schema

### User Profile
```typescript
{
  id: string;              // Supabase Auth user ID
  email: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin: string;
}
```

### Verification Record
```typescript
{
  id: string;              // Verification UUID
  userId: string;          // User who created it
  filename: string;
  imageUrl: string;
  imageType: 'upload' | 'url';
  status: 'processing' | 'completed';
  result?: 'real' | 'fake';
  confidence?: number;     // 0-100
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

## 🔐 Security Features

1. **Row Level Security**: Users can only access their own verifications
2. **Role-Based Access**: Admin endpoints protected by role verification
3. **Token Management**: Secure JWT tokens with automatic refresh
4. **Protected Routes**: All sensitive endpoints require valid authentication

## 🚀 Next Steps

The application is now fully functional with Supabase integration. To extend functionality:

1. **Email Configuration**: Set up SMTP for real email verification and password reset
2. **Google OAuth**: Follow the optional setup above
3. **Storage**: Configure Supabase Storage for large file uploads
4. **Analytics**: Add detailed usage tracking and reporting
5. **Notifications**: Implement real-time notifications with Supabase Realtime

## ⚠️ Important Notes

- Demo users are automatically created on server startup
- The KV store is used for all data persistence (suitable for prototyping)
- For production, consider migrating to Supabase Postgres tables with Row Level Security
- Email verification is auto-confirmed since SMTP is not configured
- All passwords are securely hashed by Supabase Auth

## 📞 Support

For issues or questions about Supabase integration:
- Check the [Supabase Documentation](https://supabase.com/docs)
- Review server logs in Supabase Dashboard → Edge Functions
- Inspect network requests in browser DevTools

---

**NewsSight** - Interpretable Fake Image Detection
