# 🔴 URGENT: Fix MongoDB Connection Error

## The Problem
Your MongoDB Atlas database is refusing connections with SSL/TLS errors:
```
Server selection timeout: No available servers
I/O error: received fatal alert: InternalError
```

This is why sign-in fails - NextAuth can't save user data to the database.

## ✅ Solution Steps (Do in Order)

### Step 1: Check MongoDB Atlas - IP Whitelist

1. Go to: https://cloud.mongodb.com/
2. Sign in to your MongoDB Atlas account
3. Select your cluster
4. Click **"Network Access"** in left sidebar
5. Check if your current IP is whitelisted

**Quick Fix:** Click **"Add IP Address"** → **"Allow Access from Anywhere"** (0.0.0.0/0)
- This is fine for development
- For production, whitelist specific IPs

### Step 2: Get the Correct Connection String

1. In MongoDB Atlas, click **"Database"** in left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** and version **"5.5 or later"**
5. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 3: Update Your .env.local File

Open `/Users/ramakanthpitla/CascadeProjects/splitwise/study-mart/.env.local`

Update DATABASE_URL with the FULL connection string:
```bash
DATABASE_URL="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/studymart?retryWrites=true&w=majority&appName=StudyMart"
```

**Important:**
- Replace `<username>` with your MongoDB username
- Replace `<password>` with your MongoDB password (NOT your Atlas login password)
- Add database name: `/studymart` before the `?`
- Keep `retryWrites=true&w=majority`

**Example of correct format:**
```bash
DATABASE_URL="mongodb+srv://myuser:mypass123@cluster0.abc123.mongodb.net/studymart?retryWrites=true&w=majority"
```

### Step 4: Restart Everything

```bash
# Kill the dev server (Ctrl+C)
# Then run:
npm run dev
```

Watch the terminal - you should see:
```
✅ Database connected successfully
```

If you see:
```
❌ Database connection failed: [error message]
```
Then share that error message with me.

### Step 5: Test the Connection

After restarting, visit:
```
http://localhost:3000/api/test-setup
```

You should see:
```json
{
  "database": {
    "status": "connected",
    "productCount": 0
  }
}
```

## 🚨 Common Issues & Fixes

### Issue 1: "Authentication failed"
**Cause:** Wrong username/password in connection string
**Fix:** 
1. Go to MongoDB Atlas → Database Access
2. Create a new database user or reset password
3. Update DATABASE_URL with new credentials

### Issue 2: "IP not whitelisted"
**Cause:** Your IP isn't allowed
**Fix:** Add 0.0.0.0/0 to Network Access (see Step 1)

### Issue 3: "Network timeout"
**Cause:** Firewall/VPN blocking MongoDB
**Fix:** 
- Disable VPN temporarily
- Check if firewall blocks port 27017
- Try from different network

### Issue 4: "Database name missing"
**Cause:** Connection string missing `/dbname`
**Fix:** Add `/studymart` before the `?` in your connection string

## 📋 Verification Checklist

Before trying to sign in again:
- [ ] IP whitelisted in MongoDB Atlas (0.0.0.0/0 for dev)
- [ ] DATABASE_URL has username and password filled in
- [ ] DATABASE_URL has `/studymart` database name
- [ ] Dev server restarted
- [ ] Terminal shows "✅ Database connected successfully"
- [ ] /api/test-setup shows "status": "connected"

## 🎯 Once Database is Fixed

After you see "✅ Database connected successfully":

1. Try signing in with Google again
2. The "Callback" error should be gone
3. You should be redirected to dashboard

---

**What to do now:**
1. Follow steps 1-4 above
2. Share the terminal output when you restart the server
3. Share what you see at http://localhost:3000/api/test-setup
