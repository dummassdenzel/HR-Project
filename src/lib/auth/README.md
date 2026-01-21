# Auth Integration - Usage Guide

## Overview
Server-side authentication utilities for SvelteKit 5 with Supabase. All auth logic is server-side only (no frontend UI yet).

## Files Structure

```
src/lib/
├── supabase/
│   ├── server.ts      # Server-side Supabase client factory
│   └── client.ts     # Browser-side Supabase client factory (for future use)
├── auth/
│   ├── types.ts      # TypeScript types for auth
│   ├── server.ts     # Server-side auth utilities
│   └── README.md     # This file
└── database.types.ts # Generated Supabase types

src/
├── hooks.server.ts   # Global request handler (sets up Supabase client)
└── app.d.ts          # TypeScript definitions (includes Supabase in Locals)
```

## Usage in Server Load Functions

**Important:** User is automatically fetched and cached in `event.locals.user` by `hooks.server.ts`. All auth functions use this cached value - no re-querying!

### Basic Authentication Check

```typescript
// src/routes/+layout.server.ts or +page.server.ts
import { getSessionUser } from '$lib/auth/server';

export async function load(event) {
	const user = getSessionUser(event);
	
	if (!user) {
		// User not authenticated
		return { user: null };
	}
	
	// User is authenticated
	return { user };
}
```

### Require Authentication

```typescript
import { requireAuth } from '$lib/auth/server';

export async function load(event) {
	const user = requireAuth(event);
	// If not authenticated, redirects to /login automatically
	
	return { user };
}
```

### Require Specific Role

```typescript
import { requireRole } from '$lib/auth/server';

export async function load(event) {
	const user = requireRole(event, 'hr_admin');
	// If not HR admin, redirects to /unauthorized
	
	return { user };
}
```

### Require Any of Multiple Roles

```typescript
import { requireAnyRole } from '$lib/auth/server';

export async function load(event) {
	const user = requireAnyRole(event, ['hr_admin', 'manager']);
	// If not HR admin or manager, redirects to /unauthorized
	
	return { user };
}
```

### Check Role (Non-throwing)

```typescript
import { hasRole, hasAnyRole } from '$lib/auth/server';

export async function load(event) {
	const isHR = hasRole(event, 'hr_admin');
	const isManagerOrHR = hasAnyRole(event, ['manager', 'hr_admin']);
	
	return { isHR, isManagerOrHR };
}
```

## Using Supabase Client Directly

**Important:** Always use `event.locals.supabase` - it's already set up by `hooks.server.ts`:

```typescript
// In any +page.server.ts or +layout.server.ts
export async function load({ locals }) {
	// locals.supabase is already set up by hooks.server.ts
	// No need to create a new client!
	const { data } = await locals.supabase
		.from('organizations')
		.select('*');
	
	return { data };
}
```

**Never create a new Supabase client in load functions** - use `event.locals.supabase` instead.

## SessionUser Type

The `SessionUser` type includes:

```typescript
{
	id: string;                    // User ID from Supabase Auth
	email?: string;                 // User email
	full_name: string | null;       // From user_profiles
	avatar_url: string | null;      // From user_profiles
	current_organization_id: string | null;  // First org (Phase 1)
	current_role: MembershipRole | null;    // Role in current org
}
```

## MembershipRole Type

```typescript
type MembershipRole = 'employee' | 'manager' | 'hr_admin';
```

## Redirects

The auth utilities automatically redirect to:
- `/login` - When user is not authenticated (via `requireAuth`)
- `/onboarding` - When user has no organization membership
- `/unauthorized` - When user doesn't have required role

## Architecture Benefits

- **Single query per request:** User is fetched once in `hooks.server.ts` and cached in `event.locals.user`
- **No redundant client creation:** `event.locals.supabase` is created once per request
- **Efficient:** All auth functions are synchronous (no async overhead) since user is pre-fetched
- **Type-safe:** Full TypeScript support with generated database types

## Security Notes

- All auth checks are server-side only
- Never trust client-side role checks
- RLS policies in database enforce data isolation
- Cookies are httpOnly and secure (set in Supabase client config)
- User data is fetched once per request and cached in `event.locals`

## Next Steps

1. Create login/signup pages (frontend)
2. Create protected route layouts
3. Add organization creation flow
4. Add role-based UI components

