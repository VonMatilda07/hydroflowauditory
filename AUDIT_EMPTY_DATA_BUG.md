# 🔴 CRITICAL BUG AUDIT: Empty Data in Production (RLS Blocking)

## ISSUE SUMMARY
**Production shows empty data while localhost works perfectly.**

### Root Cause: Supabase Client Using Anon Key Without Session

Your `lib/supabase.ts` creates a **browser client with ANON key only** and expects auth state to automatically persist. In production:
- Anon key has limited RLS permissions
- Session/cookie not properly passed between server-client
- RLS policies silently block data queries
- No error is thrown because queries technically succeed, but return empty arrays

---

## DETAILED AUDIT

### 1. ❌ BROKEN: `lib/supabase.ts` (Current Implementation)

**File:** [lib/supabase.ts](lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**Problems:**
1. ❌ Uses `createClient()` (browser client only) - no SSR support
2. ❌ No cookie/session management for server-side rendering
3. ❌ Anon key alone cannot pass RLS checks if policies require `auth.uid() = id`
4. ❌ Session is lost on every Vercel deployment/reload
5. ❌ No `persistSession` or cookie configuration

---

### 2. ❌ BROKEN: `app/page.tsx` - Dashboard Queries (Line 1-100)

**File:** [app/page.tsx](app/page.tsx#L1-L100)

```tsx
"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'  // ❌ Browser client without session

export default function DashboardPage() {
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    // ❌ NO USER CONTEXT - queries run as anon user
    const { data: products } = await supabase.from('products').select('*')
    const { data: txs } = await supabase.from('transactions').select('*')
    const { data: meters } = await supabase.from('meter_readings').select('*')
    
    // If RLS requires auth.uid() != null, these ALL return empty []
  }
}
```

**Problems:**
- ❌ No user authentication context
- ❌ `supabase.auth.getUser()` called in useEffect (line 22 in hooks.ts) but NOT USED to validate RLS
- ❌ Queries don't pass JWT token with authenticated session
- ❌ RLS policies block access silently

---

### 3. ❌ BROKEN: `lib/hooks.ts` - getUser() on Client Without Session

**File:** [lib/hooks.ts](lib/hooks.ts#L20-L25)

```typescript
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  router.push('/login')
  return
}
```

**Problem:**
- ❌ `getUser()` on browser client returns `null` in production
- ❌ Browser cannot access auth session without proper cookie handling
- ❌ Even if user logged in, `getUser()` has no way to verify session

---

### 4. ❌ BROKEN: App Router Session Loss

**Root Issue:**
- Server renders page with NO auth context
- Client hydrates with NO session
- Browser client can't restore session from cookies
- **Result: All queries hit RLS walls and return empty data**

---

## THE FIX: Proper Supabase SSR Setup

### Step 1: Replace `lib/supabase.ts` with Browser Client + Session Management

**New File:** [lib/supabase.ts](lib/supabase.ts)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        // This is needed for SSR to work properly
        if (typeof document === 'undefined') return []
        return document.cookie.split('; ').map(c => {
          const [name, value] = c.split('=')
          return { name, value }
        })
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieString = `${name}=${value}; ${
            options?.maxAge ? `max-age=${options.maxAge};` : ''
          }${options?.path ? `path=${options.path};` : ''}${
            options?.domain ? `domain=${options.domain};` : ''
          }`
          document.cookie = cookieString
        })
      },
    },
  }
)
```

### Step 2: Create Server Client for API Routes

**New File:** `lib/supabase-server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

### Step 3: Fix Dashboard Page - Verify User Exists

**Fix File:** [app/page.tsx](app/page.tsx#L20-L35)

Replace this:
```tsx
const fetchDashboardData = async () => {
  const { data: products } = await supabase.from('products').select('*')
```

With this:
```tsx
const fetchDashboardData = async () => {
  // FIRST: Verify user has session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (!user) {
    console.warn('No authenticated user found')
    // Queries will fail or return empty - this is expected
    return
  }
  
  console.log('✅ User authenticated:', user.id)

  // NOW queries will have user context and pass RLS checks
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
  
  if (prodError) {
    console.error('Query failed:', prodError)
    // This will show REAL error instead of silent failure
    return
  }

  // ... rest of queries
```

### Step 4: Fix Hooks - Proper Session Check

**Fix File:** [lib/hooks.ts](lib/hooks.ts#L18-L30)

Replace this:
```typescript
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  router.push('/login')
}
```

With this:
```typescript
try {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Auth error:', error.message)
    router.push('/login')
    return
  }

  if (!user) {
    console.warn('No session found')
    router.push('/login')
    return
  }

  console.log('✅ User verified:', user.email)
  // Continue with role check...
} catch (err) {
  console.error('Unexpected error:', err)
  router.push('/login')
}
```

### Step 5: API Routes - Already Correct ✅

**File:** [app/api/users/update/route.ts](app/api/users/update/route.ts#L13-L20)
**File:** [app/api/users/delete/route.ts](app/api/users/delete/route.ts#L13-L20)

These correctly use `SUPABASE_SERVICE_ROLE_KEY` for admin operations. ✅ **NO CHANGES NEEDED**

---

## WHY THIS WORKS IN LOCALHOST BUT FAILS IN PRODUCTION

| Factor | Localhost | Production (Vercel) |
|--------|-----------|-------------------|
| **Browser Session** | Next.js dev server keeps session in memory | Session lost on every request |
| **Cookies** | Dev server shares cookies easily | Cookies require explicit SSR setup |
| **RLS Policies** | Still enforced, but auth context persists | Auth context lost between renders |
| **Response** | Queries work, data returns | Queries succeed but return empty [] |

---

## VERIFICATION CHECKLIST

After applying fixes:

1. **Install Supabase SSR package:**
   ```bash
   npm install @supabase/ssr
   ```

2. **Replace the three files above**

3. **Test in production:**
   - Login with valid credentials
   - Open F12 Console
   - Should see: `✅ User authenticated: <user-id>`
   - Dashboard data should appear
   - If data still empty, check Supabase RLS policies

4. **Check Supabase RLS Policies:**
   ```sql
   -- Example: Check if 'products' table allows SELECT for authenticated users
   SELECT * FROM pg_policies WHERE schemaname='public' AND tablename='products';
   ```

   If RLS requires specific roles, verify policy:
   ```sql
   CREATE POLICY "Users can read products"
   ON products FOR SELECT
   TO authenticated
   USING (true);
   ```

---

## SUMMARY

**What changed:**
- ✅ Use `createBrowserClient` instead of `createClient`
- ✅ Add cookie management for session persistence
- ✅ Create server client for API routes
- ✅ Add explicit user verification before queries
- ✅ Add error logging to see actual RLS errors

**Why it works:**
- Browser client now maintains session across reloads
- Queries include authenticated JWT token
- RLS policies recognize authenticated user
- If user not authenticated, we catch it early instead of silent empty results

---

## Files to Modify

1. [lib/supabase.ts](lib/supabase.ts) - Replace entirely
2. lib/supabase-server.ts - Create new file
3. [app/page.tsx](app/page.tsx#L20-L35) - Add user verification
4. [lib/hooks.ts](lib/hooks.ts#L18-L30) - Add error handling
