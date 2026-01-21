# Database Schema Design - Phase 1

## Overview
Multi-tenant HR SaaS foundation with role-based access control. Designed for Supabase PostgreSQL with Row-Level Security.

## Tables

### `organizations`
**Purpose:** Tenant isolation - each organization is a separate company
- `id` (UUID): Primary key
- `name`: Company name
- `slug`: URL-friendly identifier (unique, for subdomain/path routing)
- `created_at`, `updated_at`: Timestamps

**RLS:** Users can only see orgs they belong to

### `user_profiles`
**Purpose:** Extended user data (Supabase Auth handles `auth.users`)
- `id` (UUID): References `auth.users(id)`
- `full_name`: Display name
- `avatar_url`: Profile picture URL (future)
- `created_at`, `updated_at`: Timestamps

**RLS:** Users can view profiles in their orgs, update own profile

**Note:** Auto-created via trigger when user signs up

### `organization_memberships`
**Purpose:** Many-to-many: users ↔ organizations with roles
- `id` (UUID): Primary key
- `user_id`: References `auth.users(id)`
- `organization_id`: References `organizations(id)`
- `role`: Enum ('employee', 'manager', 'hr_admin')
- `department`: Optional (future use)
- `created_at`, `updated_at`: Timestamps
- **Unique constraint:** (user_id, organization_id) - prevents duplicate memberships

**RLS:** 
- Users can view memberships in their orgs
- HR admins can manage memberships in their orgs

## Design Decisions

### Why `user_profiles` separate from `auth.users`?
- Supabase Auth manages `auth.users` (email, password, etc.)
- Profile table stores app-specific data
- Clean separation of concerns
- Can't modify `auth.users` structure

### Why role on `organization_memberships`?
- Same user can be HR in Org A, Employee in Org B
- Role is context-specific to organization
- Easy to query: "What role is user X in org Y?"

### Why `slug` on organizations?
- Enables subdomain routing (`acme.yourhr.com`) or path-based (`/org/acme`)
- Human-readable, URL-safe
- Can defer implementation, but schema ready

### Why UUID primary keys?
- Supabase standard
- No sequential ID leaks
- Better for distributed systems
- Works with Supabase Auth (uses UUIDs)

## Indexes

**Performance-critical:**
- `organization_memberships(user_id, organization_id)` - Composite for RLS lookups
- `organization_memberships(organization_id)` - Org-scoped queries
- `organizations(slug)` - Lookup by slug

**Why these indexes:**
- RLS policies query memberships frequently
- Most queries filter by org
- Slug lookups for routing

## RLS Policies Explained

### Organizations
- **SELECT:** Users see only orgs they belong to (via membership lookup)
- **INSERT:** Any authenticated user (refine in app logic for org creation rules)

### User Profiles
- **SELECT:** Own profile OR profiles in same orgs
- **UPDATE:** Only own profile
- **INSERT:** Only own profile (trigger handles signup)

### Organization Memberships
- **SELECT:** Memberships in user's orgs
- **ALL (HR admins):** HR admins can manage memberships in their orgs

## Helper Functions

### `get_user_organization(user_uuid)`
Returns first org user belongs to. For Phase 1 (single-org assumption). Can enhance later for multi-org selection.

### `user_has_role(user_uuid, org_uuid, required_role)`
Check if user has specific role in org. Useful for server-side authorization.

## Migration Steps

1. Run `001_initial_schema.sql` in Supabase SQL Editor
2. Verify tables created: `organizations`, `user_profiles`, `organization_memberships`
3. Verify RLS enabled: Check table settings in Supabase dashboard
4. Test policies: Create test users, verify access
5. Generate TypeScript types: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts`

## Future Enhancements (Not Phase 1)

- `departments` table (when org structure needed)
- `permissions` table (when granular control needed)
- `audit_logs` table (when compliance needed)
- `organization_settings` table (when org customization needed)
- Multi-org selection (enhance `get_user_organization`)

## Security Notes

- All tables have RLS enabled
- Policies use `auth.uid()` (Supabase's current user)
- Helper functions use `SECURITY DEFINER` (run with creator privileges, use carefully)
- Foreign keys have `ON DELETE CASCADE` (cleanup on user/org deletion)

