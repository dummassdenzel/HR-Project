# Creating Test Users - Guide

## Method 1: Use the Signup UI (Recommended for Testing)

This tests your full signup flow end-to-end.

### Steps:
1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:** `http://localhost:5173/auth/signup`

3. **Fill out the form:**
   - Full Name: (optional)
   - Email: `test@example.com`
   - Password: `password123` (min 8 characters)

4. **Submit** - User will be created and redirected to `/onboarding`

5. **Create organization** - Fill out org name, then you'll be redirected to dashboard

### Important: Disable Email Confirmation for Testing

By default, Supabase requires email confirmation. For testing, disable it:

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Settings**
3. Under **Email Auth**, toggle **"Enable email confirmations"** to OFF
4. Save changes

**Why:** Without this, users won't be able to sign in immediately after signup (they'll need to verify email first).

---

## Method 2: Create Users via Supabase Dashboard

Good for quick testing without going through the UI.

### Steps:
1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** → **"Create new user"**
4. Fill in:
   - Email: `admin@test.com`
   - Password: `password123`
   - Auto Confirm User: ✅ (check this!)
5. Click **"Create user"**

### After Creating User:

The user will be created in `auth.users`, but you still need to:
1. **Create organization** (via your app's `/onboarding` page)
2. **Or manually create org + membership** (see Method 3)

---

## Method 3: Create Complete Test Users (SQL)

For testing different roles quickly, you can create users + orgs + memberships directly.

### Prerequisites:
- Disable email confirmation (see Method 1)
- User must be created via Supabase Auth first (use Dashboard or signup UI)

### Steps:

1. **Create user via Dashboard** (Method 2) or signup UI
2. **Get the user's UUID** from Supabase Dashboard → Authentication → Users
3. **Run this SQL in Supabase SQL Editor:**

```sql
-- Replace USER_UUID with actual user ID from auth.users
-- Replace 'Test Company' with your org name

-- Create organization
INSERT INTO organizations (name, slug)
VALUES ('Test Company', 'test-company')
RETURNING id;

-- Note the organization ID from above, then create membership
-- Replace ORG_UUID and USER_UUID with actual IDs
INSERT INTO organization_memberships (user_id, organization_id, role)
VALUES (
  'USER_UUID_HERE',  -- Get from auth.users table
  'ORG_UUID_HERE',   -- Get from organizations table
  'hr_admin'         -- or 'manager' or 'employee'
);
```

### Complete Example Script:

```sql
-- Step 1: Create organization
DO $$
DECLARE
  org_id UUID;
  user_id UUID;
BEGIN
  -- Get user ID (replace email with your test user's email)
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = 'test@example.com';
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Create user first via Dashboard or signup UI.';
  END IF;
  
  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES ('Test Company', 'test-company')
  RETURNING id INTO org_id;
  
  -- Create membership
  INSERT INTO organization_memberships (user_id, organization_id, role)
  VALUES (user_id, org_id, 'hr_admin');
  
  RAISE NOTICE 'Created org % and membership for user %', org_id, user_id;
END $$;
```

---

## Method 4: Test User Scenarios

Create users for each role to test your RBAC:

### HR Admin User:
1. Sign up: `hr@test.com` / `password123`
2. Create org: "HR Test Company"
3. User automatically gets `hr_admin` role

### Manager User:
1. Sign up: `manager@test.com` / `password123`
2. Create org: "Manager Test Company"
3. User gets `hr_admin` (creator), but you can change it:

```sql
-- Change role to manager
UPDATE organization_memberships
SET role = 'manager'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'manager@test.com');
```

### Employee User:
1. Sign up: `employee@test.com` / `password123`
2. Create org: "Employee Test Company"
3. Change role to employee:

```sql
UPDATE organization_memberships
SET role = 'employee'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'employee@test.com');
```

---

## Quick Testing Checklist

- [ ] Disable email confirmation in Supabase settings
- [ ] Create user via signup UI
- [ ] Create organization via onboarding
- [ ] Sign in with created user
- [ ] Verify redirect to appropriate dashboard based on role
- [ ] Test role-based route access:
  - [ ] HR admin can access `/app/admin`
  - [ ] Manager can access `/app/manager`
  - [ ] Employee can access `/app/employee`

---

## Troubleshooting

### "User not found" errors
- Make sure user exists in `auth.users` table
- Check Supabase Dashboard → Authentication → Users

### "No organization" redirects
- User needs to create org via `/onboarding`
- Or manually create org + membership (Method 3)

### "Email not confirmed" errors
- Disable email confirmation in Supabase settings
- Or verify email via link sent to inbox

### Can't sign in after signup
- Check if email confirmation is enabled
- Check browser console for errors
- Verify user exists in Supabase Dashboard

---

## Recommended Testing Flow

1. **First user (HR Admin):**
   - Use signup UI → Create org → Test admin features

2. **Additional users:**
   - Use signup UI for each role
   - Or use Supabase Dashboard for quick creation
   - Manually adjust roles via SQL if needed

3. **Test multi-tenant:**
   - Create users in different orgs
   - Verify they can't see each other's data (RLS)

