# NextAuth Callback Error - Debugging Guide

## Current Status
The app is experiencing "Callback" errors when signing in with Google.

## What I've Added

1. **Enhanced Logging**: All NextAuth callbacks now log detailed information
2. **Error Protection**: JWT callback won't crash if database fails
3. **Email Linking**: Added `allowDangerousEmailAccountLinking: true` to allow existing accounts
4. **Debug Mode**: Enabled full debug logging

## Required Environment Variables

Create/update `.env.local` in the project root:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Database
DATABASE_URL=your-mongodb-connection-string

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=your-region
AWS_S3_BUCKET=your-bucket-name
```

## Google OAuth Setup

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project
3. Click on your OAuth 2.0 Client ID
4. Add these **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:3001/api/auth/callback/google
   ```
5. Add these **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   http://localhost:3001
   ```
6. Click **Save**

## How to Debug

### Step 1: Check Environment Variables
Run this in your terminal:
```bash
cd /Users/ramakanthpitla/CascadeProjects/splitwise/study-mart
cat .env.local
```

Verify all variables are set (don't share values publicly).

### Step 2: Test Database Connection
Visit: http://localhost:3000/api/test-setup

You should see:
```json
{
  "env": {
    "NEXTAUTH_URL": "http://localhost:3000",
    "NEXTAUTH_SECRET": "SET",
    "GOOGLE_CLIENT_ID": "SET",
    ...
  },
  "database": {
    "status": "connected",
    ...
  }
}
```

### Step 3: Try Sign In with Logs
1. Open terminal where `npm run dev` is running
2. Go to: http://localhost:3000/auth/signin
3. Click "Sign in with Google"
4. **Watch the terminal** - you'll see logs like:
   ```
   [NextAuth] Redirect callback: { url: '...', baseUrl: '...' }
   [NextAuth] JWT callback triggered: { hasUser: true, ... }
   ```

### Step 4: Check for Common Issues

**Issue 1: Missing NEXTAUTH_SECRET**
Error will mention "secret" in terminal.
Fix: Add `NEXTAUTH_SECRET=any-random-string-32-chars` to .env.local

**Issue 2: Wrong Redirect URI**
Error in terminal: "redirect_uri_mismatch"
Fix: Check Google Console matches your actual URL (localhost:3000 or 3001)

**Issue 3: Database Connection Failed**
Error: "PrismaClient failed to initialize"
Fix: Check DATABASE_URL is correct in .env.local

**Issue 4: Email Already Used**
Error: "account already exists"
Fix: Already handled with `allowDangerousEmailAccountLinking: true`

## What to Share if Still Broken

If sign-in still fails after checking above:

1. **Terminal output** when you click "Sign in with Google" (copy all logs)
2. **Browser console errors** (F12 → Console tab, screenshot)
3. **Error URL** - if redirected to `/auth/error?error=...`, copy the full URL
4. **Test setup output** from http://localhost:3000/api/test-setup

## Next Steps

Once sign-in works:
- Visit http://localhost:3000/dashboard to see your purchases
- Visit http://localhost:3000/browse to see study materials
- If admin, visit http://localhost:3000/admin/submissions to manage uploads
