# Deployment Guide - Study-Mart

## Critical Issues Fixed

### 1. **Google OAuth Sign-In Issue**
**Problem**: `Error 400: redirect_uri_mismatch` when signing in on deployed application.

**Root Cause**: The OAuth callback URL registered in Google Cloud Console doesn't match the deployed domain.

**Solution**: Set the `NEXTAUTH_URL` environment variable to match your deployed domain.

### 2. **Product Deletion Issue**
**Problem**: Product deletion endpoint was not being called correctly.

**Fixed**: Updated delete button to call `/api/admin/products/{id}` instead of incorrect endpoint.

---

## Environment Variables for Deployment

### For Vercel Deployment:
Add these variables in your Vercel project settings (Settings → Environment Variables):

```
# Authentication
NEXTAUTH_URL=https://your-deployed-domain.com
NEXTAUTH_SECRET=<generate-a-strong-random-secret>

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Database
DATABASE_URL=<your-mongodb-connection-string>

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-deployed-domain.com

# AWS S3
AWS_REGION=ap-south-2
AWS_S3_BUCKET=<your-s3-bucket-name>
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=<your-razorpay-key>
RAZORPAY_KEY_SECRET=<your-razorpay-secret>
```

### For Google Cloud Console:
1. Go to Google Cloud Console
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add Authorized redirect URIs:
   - `https://your-deployed-domain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local development)

---

## Deployment Checklist

- [ ] Update `NEXTAUTH_URL` to your deployed domain
- [ ] Ensure `NEXTAUTH_SECRET` is set (use a strong, random string)
- [ ] Add callback URI to Google Cloud Console
- [ ] Verify database connection string is correct
- [ ] Test sign-in flow after deployment
- [ ] Test product deletion from admin panel
- [ ] Verify PDF preview functionality

---

## Important Notes

1. **NEXTAUTH_URL**: This MUST match your deployed domain exactly. Common mistake: having `http://` instead of `https://` for production.

2. **Database**: The MongoDB connection string is shared. In production, consider using separate databases for staging and production.

3. **AWS Credentials**: Keep these secrets secure. Rotate them periodically.

4. **Security**: 
   - Always use HTTPS in production
   - Keep NEXTAUTH_SECRET different from development
   - Never commit `.env.local` to version control

---

## Troubleshooting

### Sign-in not working after deployment
1. Check that `NEXTAUTH_URL` matches your deployed domain exactly
2. Verify the callback URI is registered in Google Cloud Console
3. Clear browser cookies and cache, then try again
4. Check server logs for detailed error messages

### Product deletion failing
1. Verify user has ADMIN role
2. Check that the product exists in the database
3. Ensure S3 credentials are valid for file cleanup
4. Check server logs for specific error messages

### PDF preview not loading
1. Verify AWS S3 credentials are correct
2. Check that PDF files are properly uploaded to S3
3. Ensure the API response headers are correct
4. Test with a small PDF first

