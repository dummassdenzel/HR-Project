# Implementation Guide: Role-Based Authentication

## Quick Start Checklist

### Step 1: Supabase Setup

1. **Create Supabase Account**
   - Go to https://supabase.com
   - Create new project
   - Choose region closest to your users
   - Note down: Project URL, anon key, service_role key

2. **Configure Environment Variables**
   - Create `.env` file (already in .gitignore)
   - Add Supabase credentials

3. **Database Setup**
   - Run initial migration SQL
   - Configure RLS policies
   - Set up initial roles

### Step 2: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install -D @supabase/auth-helpers-sveltekit
```

### Step 3: Project Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client
│   │   ├── server.ts          # Server Supabase client
│   │   └── types.ts           # Generated database types
│   ├── auth/
│   │   ├── roles.ts           # Role definitions & permissions
│   │   ├── middleware.ts      # Auth middleware helpers
│   │   └── guards.ts          # Route protection guards
│   ├── types/
│   │   └── user.ts            # User type definitions
│   └── utils/
│       └── validation.ts      # Zod schemas
├── routes/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── logout/
│   ├── (protected)/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   └── settings/
│   └── api/
│       └── auth/
└── hooks.server.ts            # Global auth hooks
```

---

## Implementation Details

### 1. Supabase Client Setup

**`src/lib/supabase/client.ts`** (Browser)
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );
}
```

**`src/lib/supabase/server.ts`** (Server)
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from '@sveltejs/kit';
import type { Database } from './types';

export function createClient(event: RequestEvent) {
  return createServerClient<Database>(
    event.env.VITE_SUPABASE_URL!,
    event.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return event.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
```

### 2. Role Definitions

**`src/lib/auth/roles.ts`**
```typescript
export type UserRole = 'super_admin' | 'org_admin' | 'hr_manager' | 'manager' | 'employee';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  HR_MANAGER: 'hr_manager',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 5,
  org_admin: 4,
  hr_manager: 3,
  manager: 2,
  employee: 1,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canAccess(userRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];
}
```

### 3. Auth Middleware

**`src/hooks.server.ts`**
```typescript
import { createClient } from '$lib/supabase/server';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const authHandle: Handle = async ({ event, resolve }) => {
  const supabase = createClient(event);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  event.locals.user = session?.user ?? null;
  event.locals.supabase = supabase;

  // Protect routes that require authentication
  if (event.route.id?.startsWith('/(protected)')) {
    if (!session) {
      throw redirect(303, '/login');
    }
  }

  // Redirect authenticated users away from auth pages
  if (event.route.id?.startsWith('/(auth)')) {
    if (session) {
      throw redirect(303, '/dashboard');
    }
  }

  return resolve(event);
};

export const handle = sequence(authHandle);
```

### 4. Type Definitions

**`src/app.d.ts`** (extend existing)
```typescript
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: Session['user'] | null;
    }
    interface PageData {
      session: Session | null;
    }
  }
}
```

### 5. Protected Route Example

**`src/routes/(protected)/dashboard/+page.server.ts`**
```typescript
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ROLES } from '$lib/auth/roles';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  // Get user profile with role
  const { data: profile } = await locals.supabase
    .from('user_profiles')
    .select('*')
    .eq('id', locals.user.id)
    .single();

  if (!profile) {
    throw redirect(303, '/login');
  }

  // Role-based data loading
  let employees;
  if (profile.role === ROLES.HR_MANAGER || profile.role === ROLES.ORG_ADMIN) {
    // Load all employees in organization
    const { data } = await locals.supabase
      .from('user_profiles')
      .select('*')
      .eq('organization_id', profile.organization_id);
    employees = data;
  } else if (profile.role === ROLES.MANAGER) {
    // Load only team members
    const { data } = await locals.supabase
      .from('user_profiles')
      .select('*')
      .eq('manager_id', profile.id);
    employees = data;
  }

  return {
    user: profile,
    employees: employees || [],
  };
};
```

---

## Database Migration SQL

Create this in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}'::jsonb
);

-- User profiles (extends auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'employee',
  department_id UUID,
  manager_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for department_id in user_profiles
ALTER TABLE user_profiles 
ADD CONSTRAINT fk_department 
FOREIGN KEY (department_id) REFERENCES departments(id);

-- Row-Level Security Policies

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users see own organization"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- User profiles: Users can see profiles in their organization
CREATE POLICY "Users see organization profiles"
ON user_profiles FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- User profiles: Users can update their own profile
CREATE POLICY "Users update own profile"
ON user_profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Departments: Users can see departments in their organization
CREATE POLICY "Users see organization departments"
ON departments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_departments_organization ON departments(organization_id);
```

---

## Environment Variables Template

Create `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: For server-side operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Next Steps After Setup

1. ✅ Test authentication flow
2. ✅ Create role assignment UI
3. ✅ Implement permission checks
4. ✅ Build user profile management
5. ✅ Add organization management
6. ✅ Create dashboard with role-based views

