# Vercel Deployment Setup Guide

## Problem: Sidebar Missing on Production

**Root Cause**: Environment variables tidak ter-sync dari `.env.local` ke Vercel. Sidebar component membutuhkan Supabase connection untuk load user data.

## Solution: Configure Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/dashboard
2. Select your HydroFlow project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Variables
Add the following from your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL = https://zgfqmecduyaibsrixlas.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_DLWSTkMmk-QP9TPbJoPhWQ_DhkYKCKe
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZnFtZWNkdXlhaWJzcml4bGFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk1ODg2NSwiZXhwIjoyMDgzNTM0ODY1fQ.Bp7pNGN_6BdUJDR8QaFyzVlq_sd4hvoJUPq9v2rfCYg
```

### Step 3: Set Environment Scope
- For **NEXT_PUBLIC_*** variables: Select `Production`, `Preview`, and `Development`
- For **SUPABASE_SERVICE_ROLE_KEY**: Select only `Production` (security best practice)

### Step 4: Redeploy
After adding variables:
1. Go to **Deployments** tab
2. Click the latest deployment
3. Click **Redeploy** button
4. Wait for deployment to complete

### Step 5: Verify
- Visit your deployed site (hydroflowauditory-tyx7.vercel.app)
- Sidebar should now appear on the left
- You should be able to login and see user data

## Troubleshooting

**Sidebar still not showing?**
1. Clear browser cache (Ctrl+Shift+Del)
2. Check browser console (F12) for errors
3. Verify all environment variables are set correctly
4. Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match exactly

**Getting CORS errors?**
- Make sure your Supabase project CORS settings allow your Vercel domain
- Go to Supabase dashboard → Project Settings → API → CORS

## Notes
- `.env.local` is only for local development
- Never commit `.env.local` to git (it's in `.gitignore`)
- Always set environment variables in Vercel dashboard for production
